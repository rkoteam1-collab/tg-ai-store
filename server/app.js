import express from 'express';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {equalSecret,opaqueToken,telegramUser,validateProducts,validatePromos,calculateOrder} from './security.js';
import {buildReceipt} from './receipt.js';
import {APP_RELEASE,STATIC_ORIGIN} from './launch.js';
import {webhookSecret,TELEGRAM_WEBHOOK_PATH} from './bot-webhook.js';
import {BOOTSTRAP_HASH} from './bootstrap.js';

function gatewayLink(value) {
  if (typeof value === 'string') {
    if (value.startsWith('https://')) return value;
    try { value=JSON.parse(value); } catch { return undefined; }
  }
  const url=value?.desktop||value?.android||value?.ios;
  return typeof url==='string' && url.startsWith('https://') ? url : undefined;
}

export function createApp({config,store,telegram,fetchImpl=fetch,distPath,telegramWebhook}) {
  const app=express(), sessions=new Map(), limits=new Map(), reconciling=new Map();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY_HOPS) app.set('trust proxy',Number(config.TRUST_PROXY_HOPS));
  app.use(compression());
  app.use((req,res,next)=>{
    res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' https://telegram.org "+BOOTSTRAP_HASH+"; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org"});
    if (req.path.startsWith('/api/')) res.set('Cache-Control','no-store'); next();
  });
  app.use('/api',(req,res,next)=>{
    const origin=req.get('Origin');
    if(origin===STATIC_ORIGIN){res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Telegram-Init-Data, X-Order-Token, X-Catalog-Revision','Access-Control-Max-Age':'600'});}
    if(req.method==='OPTIONS')return res.sendStatus(origin===STATIC_ORIGIN?204:403);
    next();
  });
  app.use(express.json({limit:'128kb'}));
  function rate(label,max,duration=60000) {return (req,res,next)=>{
    const now=Date.now(); for (const [k,v] of limits) if (v.until<now) limits.delete(k);
    const key=`${label}:${req.ip}`, v=limits.get(key)||{count:0,until:now+duration};
    v.count++; limits.set(key,v);
    if (limits.size>10000 || v.count>max) return res.status(429).json({message:'Слишком много запросов. Повторите позже.'}); next();
  };}
  app.post(TELEGRAM_WEBHOOK_PATH,rate('telegram',120),(req,res,next)=>{
    if(!telegramWebhook||!equalSecret(req.get('X-Telegram-Bot-Api-Secret-Token'),webhookSecret(config.BOT_TOKEN)))return res.sendStatus(403);
    return telegramWebhook(req,res,next);
  });
  const user=req=>telegramUser(req.get('X-Telegram-Init-Data'),config.BOT_TOKEN);
  function admin(req,res,next) {
    const token=req.get('Authorization')?.replace(/^Bearer /,'');
    if (sessions.get(token)>Date.now()) return next(); sessions.delete(token);
    return res.status(401).json({message:'Войдите в панель управления'});
  }
  function owner(req,order) {const u=user(req);return (u && String(u.id)===String(order.telegramId)) || equalSecret(req.get('X-Order-Token'),order.accessToken);}
  app.get('/api/health',(req,res)=>res.json({ok:true,release:APP_RELEASE,botTransport:telegramWebhook?'webhook':'disabled'}));
  const catalogRevision=()=>createHash('sha256').update(JSON.stringify(store.read('products'))).digest('hex');
  app.get('/api/catalog',(req,res)=>res.json({products:store.read('products').filter(p=>p.active!==false),revision:catalogRevision()}));
  app.get('/api/products',(req,res)=>res.json(store.read('products').filter(p=>p.active!==false)));
  app.post('/api/admin/verify',rate('login',5,900000),(req,res)=>{
    const u=user(req), signed=u && config.ADMIN_ID && String(u.id)===String(config.ADMIN_ID);
    const pin=config.ADMIN_PIN?.length>=4 && equalSecret(req.body?.pin,config.ADMIN_PIN);
    if (!signed && !pin) return res.status(401).json({success:false,message:'Неверные данные входа'});
    for (const [k,v] of sessions) if (v<=Date.now()) sessions.delete(k);
    const token=opaqueToken(); sessions.set(token,Date.now()+3600000); res.json({success:true,token});
  });
  app.get('/api/admin/config',(req,res)=>res.json({adminId:config.ADMIN_ID||null}));
  app.post('/api/admin/logout',(req,res)=>{sessions.delete(req.get('Authorization')?.replace(/^Bearer /,''));res.json({success:true});});
  app.post('/api/products',rate('write',30),admin,(req,res)=>{
    if (!validateProducts(req.body)) return res.status(400).json({message:'Некорректный каталог'});
    if(req.get('X-Catalog-Revision')!==catalogRevision())return res.status(409).json({message:'Каталог уже изменён. Обновите каталог перед сохранением, чтобы не затереть новые правки.'});
    store.write('products',req.body);res.json({success:true,revision:catalogRevision()});
  });
  app.post('/api/admin/orders',rate('orders',30),admin,(req,res)=>res.json(store.read('orders').map(({accessToken,...o})=>o)));
  app.get('/api/admin/promos',admin,(req,res)=>res.json(store.read('promos')));
  app.post('/api/admin/promos',rate('promos-write',30),admin,(req,res)=>{
    if(!validatePromos(req.body))return res.status(400).json({message:'Код: 2–32 латинские буквы, цифры, _ или -. Скидка: целое число от 1 до 90. Коды не должны повторяться.'});
    store.write('promos',req.body);res.json({success:true});
  });
  app.post('/api/promos/validate',rate('promo-check',15),(req,res)=>{
    const code=String(req.body?.code||'').trim().toUpperCase();
    const promo=store.read('promos').find(p=>p.code===code&&p.active);
    if(!promo)return res.status(400).json({message:'Промокод не найден или отключён'});
    res.json({code:promo.code,discountPercent:promo.discountPercent});
  });
  const claimed=id=>store.read('orders').some(o=>o.status==='paid' && o.channelPercent===5 && String(o.telegramId)===String(id)) || store.read('channel_discounts').includes(String(id));
  app.get('/api/subscription-status/:userId',(req,res)=>{
    const u=user(req);if (!u || String(u.id)!==req.params.userId) return res.status(401).json({message:'Откройте магазин в Telegram'});
    res.json({hasClaimed:claimed(u.id)});
  });
  async function subscribed(id) {
    if (!telegram) return false;
    const m=await telegram.getChatMember('@AIshopifystore',id);
    return ['member','administrator','creator'].includes(m.status) || (m.status==='restricted' && m.is_member===true);
  }
  app.post('/api/check-subscription',rate('subscription',10),async(req,res)=>{
    const u=user(req);if (!u) return res.status(401).json({message:'Откройте магазин в Telegram'});
    if (claimed(u.id)) return res.json({success:false,alreadyClaimed:true,message:'Скидка уже использована'});
    try {const ok=await subscribed(u.id);res.json({success:ok,discountPercent:ok?5:0,notSubscribed:!ok,message:ok?'Подписка подтверждена. Скидка применяется при оплате.':'Подпишитесь на @AIshopifystore и повторите проверку'});}
    catch {res.status(503).json({message:'Проверка подписки временно недоступна'});}
  });
  const gateway='https://api.gw.itpay.ru/v1/payments';
  const auth=()=>`Basic ${Buffer.from(`${config.ALFA_SBP_ID}:${config.ALFA_SBP_KEY}`).toString('base64')}`;
  app.post('/api/payments/create',rate('payment',5),async(req,res)=>{
    if (!config.ALFA_SBP_ID || !config.ALFA_SBP_KEY) return res.status(503).json({message:'Платёжный сервис временно недоступен'});
    const b=req.body||{},u=user(req);
    if(config.RENDER==='true'&&!u)return res.status(401).json({message:'Для связи со специалистом откройте магазин в Telegram и повторите заказ.'});
    if (req.get('X-Telegram-Init-Data') && !u) return res.status(401).json({message:'Сессия Telegram истекла. Откройте магазин заново.'});
    if (typeof b.email!=='string' || b.email.length>254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(b.email) || b.acceptOffer!==true) return res.status(400).json({message:'Укажите email и примите условия заказа'});
    let order;
    try {
      let channelPercent=0;
      if (b.channelDiscount) {
        if (!u || claimed(u.id) || !await subscribed(u.id)) return res.status(409).json({message:'Скидка за подписку недоступна. Проверьте подписку повторно.'});
        channelPercent=5;
      }
      const existing=store.read('orders');
      if (channelPercent && existing.some(o=>o.channelPercent && String(o.telegramId)===String(u.id) && ['creating','pending','review'].includes(o.status))) return res.status(409).json({message:'У вас уже есть неоплаченный счёт со скидкой'});
      const available=store.read('products').filter(p=>p.active!==false).map(p=>({...p,stock:p.stock-existing.filter(o=>['creating','pending','review','paid'].includes(o.status)).reduce((s,o)=>s+(o.inventoryReserved ? o.items.filter(i=>i.id===p.id).reduce((q,i)=>q+i.quantity,0):0),0)}));
      if(!Array.isArray(b.items)||b.items.some(i=>!available.some(p=>p.id===i?.id&&!p.priceOnRequest&&p.inStock&&p.stock>=i.quantity)))return res.status(409).json({message:'Товар закончился или отключён. Обновите каталог. Счёт не создан.'});
      const quote=calculateOrder(b.items,available,b.promoCode,channelPercent,store.read('promos'));
      if (Number(b.expectedAmount)!==quote.amount) return res.status(409).json({message:'Цена изменилась. Обновите каталог и проверьте итог.'});
      order={id:`AI-${randomUUID()}`,accessToken:opaqueToken(),...quote,email:b.email.trim(),telegramId:u?.id||null,telegramUsername:typeof u?.username==='string'?u.username:null,status:'creating',inventoryReserved:true,termsVersion:'2026-10-21',createdAt:new Date().toISOString()};
      store.saveOrder(order);
      const client_receipt=buildReceipt(order,config);
      const r=await fetchImpl(gateway,{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:auth(),'Content-Type':'application/json'},body:JSON.stringify({amount:quote.amount.toFixed(2),client_payment_id:order.id,method:'sbp',description:`Заказ ${order.id}`,client_receipt,metadata:{email:order.email,order_id:order.id}})});
      const data=await r.json();if (!r.ok || data.error) throw new Error('Gateway rejected');
      const p=data.data||data,qrUrl=gatewayLink(p?.payment_qr_urls),qrImage=gatewayLink(p?.payment_qr_images);
      if (!p?.id || !/^https:\/\//.test(qrUrl)) throw new Error('Invalid gateway response');
      Object.assign(order,{status:'pending',itpayId:p.id,qrUrl,qrImage,fiscalizationRequested:!!client_receipt,kassaConnected:p.kassa_connected===true});store.saveOrder(order);
      res.json({success:true,orderId:order.id,accessToken:order.accessToken,amount:order.amount,qrUrl,qrImage});
    } catch {
      if (order) {order.status='review';store.saveOrder(order);return res.status(502).json({message:`Не удалось подтвердить создание счёта. Обратитесь в поддержку с номером ${order.id}, не повторяйте оплату.`});}
      res.status(400).json({message:'Проверьте корзину, остатки и скидки'});
    }
  });
  async function reconcile(id) {
    if (reconciling.has(id)) return reconciling.get(id);
    const work=(async()=>{
      let order=store.read('orders').find(o=>o.id===id);
      if (!order || !order.itpayId) return order;
      const r=await fetchImpl(`${gateway}/${encodeURIComponent(order.itpayId)}`,{headers:{Authorization:auth()},signal:AbortSignal.timeout(10000)});
      if (!r.ok) throw new Error('Gateway unavailable');const result=await r.json(),p=result.data||result;
      if (String(p?.id)!==String(order.itpayId) || p?.client_payment_id!==order.id || Math.round(Number(p?.amount)*100)!==Math.round(order.amount*100) || (p.currency && p.currency!=='RUB')) throw new Error('Payment identity mismatch');
      order=store.read('orders').find(o=>o.id===id);
      order.receipts=Array.isArray(p.receipts)?p.receipts.map(r=>({id:r.id,state:r.state,url:gatewayLink(r.link_to_receipt)})):order.receipts||[];
      store.saveOrder(order);
      if (['paid','completed'].includes(p.status) && order.status!=='paid') {
        order.status='paid';order.paidAt=new Date().toISOString();store.saveOrder(order);
        if (telegram && config.ADMIN_ID) try {await telegram.sendMessage(config.ADMIN_ID,`Оплачен заказ ${order.id}. Сумма ${order.amount} ₽. Покупатель: ${order.telegramUsername?'@'+order.telegramUsername:order.telegramId||'не указан'}; Telegram ID: ${order.telegramId||'не указан'}. Свяжитесь после оплаты; срок подключения согласуется после оплаты. Откройте защищённую панель заказов.`);} catch {console.error('Order notification failed');}
      } else if (order.status!=='paid' && ['cancelled','rejected','error'].includes(p.status)) {order.status=p.status;store.saveOrder(order);}
      return order;
    })();
    reconciling.set(id,work);try{return await work;}finally{reconciling.delete(id);}
  }
  app.get('/api/payments/status/:orderId',rate('status',60),async(req,res)=>{
    let order=store.read('orders').find(o=>o.id===req.params.orderId);
    if (!order || !owner(req,order)) return res.status(404).json({message:'Заказ не найден'});
    try {order=await reconcile(order.id);} catch {return res.status(503).json({message:'Проверка оплаты временно недоступна'});}
    res.json({success:true,status:order.status,orderId:order.id,amount:order.amount});
  });
  app.post('/api/payments/alfa/webhook',rate('webhook',120),async(req,res)=>{
    const p=req.body?.data||req.body?.payment||req.body||{};
    const order=store.read('orders').find(o=>(p.id && String(o.itpayId)===String(p.id)) || (p.client_payment_id && o.id===p.client_payment_id));
    if (!order) return res.json({status:'ok'});
    try {await reconcile(order.id);res.json({status:'ok'});} catch {res.status(503).json({status:'retry'});}
  });
  app.use('/api',(req,res)=>res.status(404).json({message:'Маршрут не найден'}));
  if (distPath && fs.existsSync(distPath)) {
    app.use(express.static(distPath,{setHeaders(res,file){res.set('Cache-Control',file.includes(`${path.sep}assets${path.sep}`)?'public, max-age=31536000, immutable':'no-store, max-age=0');}}));
    app.get('/{*path}',(req,res)=>res.sendFile(path.join(distPath,'index.html')));
  }
  app.use((error,req,res,next)=>{console.error('Request failed:',error.type||'internal');res.status(error.type==='entity.too.large'?413:error.type==='entity.parse.failed'?400:500).json({message:'Не удалось обработать запрос'});});
  return app;
}
