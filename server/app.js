import express from 'express';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {equalSecret,opaqueToken,telegramUser,validateProducts,validatePromos,calculateOrder} from './security.js';
import {buildReceipt} from './receipt.js';
import {APP_RELEASE,STATIC_ORIGIN} from './launch.js';
import {webhookSecret,TELEGRAM_WEBHOOK_PATH} from './bot-webhook.js';
import {CHAT_WEBHOOK_PATH} from './chat/bot.js';
import {BOOTSTRAP_HASH} from './bootstrap.js';
import {PRIVACY_CONSENT_VERSION,PRIVACY_CONSENT_TEXT} from '../shared/privacyConsent.js';
import {PAID_PAYMENT_STATUSES,CLOSED_UNPAID_PAYMENT_STATUSES,KNOWN_PAYMENT_STATUSES} from './payment-status.js';
import {createPurchaseConfirmations,PURCHASE_CONFIRMATION_VERSION} from './purchase-confirmations.js';
import {createSocrateCatalog} from './socrate-catalog.js';

function gatewayLink(value) {
  if (typeof value === 'string') {
    if (value.startsWith('https://')) return value;
    try { value=JSON.parse(value); } catch { return undefined; }
  }
  const url=value?.desktop||value?.android||value?.ios;
  return typeof url==='string' && url.startsWith('https://') ? url : undefined;
}

export function createApp({config,store,telegram,fetchImpl=fetch,distPath,telegramWebhook,chatWebhook,reminders}) {
  const app=express(), sessions=new Map(), limits=new Map(), reconciling=new Map();
  const purchaseConfirmations=createPurchaseConfirmations({store,telegram,config});
  const supplierCatalog=createSocrateCatalog({config,fetchImpl});
  app.locals.syncSupplierCatalog=()=>supplierCatalog.refresh();
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
    if(origin===STATIC_ORIGIN){res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Telegram-Init-Data, X-Order-Token, X-Catalog-Revision, X-Admin-Catalog','Access-Control-Max-Age':'600'});}
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
  app.post(CHAT_WEBHOOK_PATH,rate('chat-telegram',120),(req,res,next)=>{
    if(!chatWebhook||!equalSecret(req.get('X-Telegram-Bot-Api-Secret-Token'),webhookSecret(config.CHAT_BOT_TOKEN)))return res.sendStatus(403);
    return chatWebhook(req,res,next);
  });
  const user=req=>telegramUser(req.get('X-Telegram-Init-Data'),config.BOT_TOKEN);
  function admin(req,res,next) {
    const token=req.get('Authorization')?.replace(/^Bearer /,'');
    if (sessions.get(token)>Date.now()) return next(); sessions.delete(token);
    return res.status(401).json({message:'Войдите в панель управления'});
  }
  function owner(req,order) {const u=user(req);return (u && String(u.id)===String(order.telegramId)) || equalSecret(req.get('X-Order-Token'),order.accessToken);}
  app.get('/api/health',(req,res)=>{res.json({ok:true,release:APP_RELEASE,privacyConsentVersion:PRIVACY_CONSENT_VERSION,orderMode:'manual',remindersEnabled:!!reminders,purchaseConfirmationsEnabled:!!telegram&&config.BOT_ENABLED!=='false',supplierCatalog:supplierCatalog.status(),botTransport:telegramWebhook?'webhook':'disabled'});void supplierCatalog.refresh();app.locals.runReminders().catch(()=>console.error('Reminder check failed'));});
  app.locals.runReminders=async()=>{await purchaseConfirmations.flush();await reminders?.runDue(reconcile);};
  app.get('/api/reminders',rate('reminder-status',30),(req,res)=>{
    const u=user(req);if(!u)return res.status(401).json({message:'Откройте магазин в Telegram'});
    if(!reminders)return res.status(503).json({message:'Напоминания временно недоступны'});
    res.json(reminders.status(u.id));
  });
  app.post('/api/reminders/consent',rate('reminder-consent',10),(req,res)=>{
    const u=user(req);if(!u)return res.status(401).json({message:'Откройте магазин в Telegram'});
    if(!reminders)return res.status(503).json({message:'Напоминания временно недоступны'});
    if(typeof req.body?.enabled!=='boolean')return res.status(400).json({message:'Укажите настройку напоминания'});
    try{res.json(reminders.consent(u.id,req.body.enabled,req.body.version));}catch(e){res.status(400).json({message:e.message});}
  });
  app.post('/api/reminders/activity',rate('reminder-activity',20),(req,res)=>{
    const u=user(req);if(!u)return res.status(401).json({message:'Откройте магазин в Telegram'});
    if(!reminders)return res.status(503).json({message:'Напоминания временно недоступны'});
    const {sessionId,hasCart}=req.body||{};
    if(typeof sessionId!=='string'||!/^[a-zA-Z0-9-]{8,100}$/.test(sessionId)||typeof hasCart!=='boolean')return res.status(400).json({message:'Некорректное событие'});
    res.json(reminders.activity(u.id,sessionId,hasCart));
  });
  app.get('/api/chat/offer',(req,res)=>{
    res.json({available:false,packTokens:1000000,chatBotUsername:'AIshopifyGPT_bot'});
  });
  const catalogRevision=()=>createHash('sha256').update(JSON.stringify(store.read('products'))).digest('hex');
  app.get('/api/catalog',(req,res)=>res.json({products:supplierCatalog.decorate(store.read('products').filter(p=>p.active!==false)),revision:catalogRevision()}));
  app.get('/api/products',(req,res)=>res.json(supplierCatalog.decorate(store.read('products').filter(p=>p.active!==false))));
  app.post('/api/admin/verify',rate('login',5,900000),(req,res)=>{
    const raw=req.get('X-Telegram-Init-Data'),u=user(req), signed=u && config.ADMIN_ID && String(u.id)===String(config.ADMIN_ID);
    if(!raw)return res.status(401).json({success:false,code:'TELEGRAM_SESSION_MISSING',message:'Telegram не передал данные аккаунта. Закройте приложение, отправьте боту /start и откройте магазин новой кнопкой под сообщением.'});
    if(!u)return res.status(401).json({success:false,code:'TELEGRAM_SESSION_INVALID',message:'Сессия Telegram истекла или не подтверждена. Закройте приложение, отправьте боту /start и откройте магазин новой кнопкой под сообщением.'});
    if(!signed)return res.status(403).json({success:false,code:'ADMIN_ACCOUNT_REQUIRED',message:'Этот Telegram-аккаунт не назначен владельцем магазина.'});
    if(!config.ADMIN_PIN||config.ADMIN_PIN.length<4)return res.status(503).json({success:false,code:'ADMIN_PIN_NOT_CONFIGURED',message:'PIN администратора не настроен на сервере.'});
    const pin=config.ADMIN_PIN?.length>=4 && equalSecret(req.body?.pin,config.ADMIN_PIN);
    if (!pin) return res.status(401).json({success:false,code:'INVALID_ADMIN_PIN',message:'Неверный PIN администратора.'});
    for (const [k,v] of sessions) if (v<=Date.now()) sessions.delete(k);
    const token=opaqueToken(); sessions.set(token,Date.now()+3600000); res.json({success:true,token});
  });
  app.get('/api/admin/config',(req,res)=>res.json({adminId:config.ADMIN_ID||null}));
  app.get('/api/admin/catalog',admin,(req,res)=>res.json({products:supplierCatalog.decorate(store.read('products'),{privateFields:true}),revision:catalogRevision()}));
  app.get('/api/admin/supplier-status',admin,(req,res)=>res.json(supplierCatalog.status()));
  app.post('/api/admin/logout',(req,res)=>{sessions.delete(req.get('Authorization')?.replace(/^Bearer /,''));res.json({success:true});});
  app.post('/api/products',rate('write',30),admin,(req,res)=>{
    if(req.get('X-Admin-Catalog')!=='complete')return res.status(409).json({message:'Обновите приложение и загрузите полный каталог в админке перед сохранением.'});
    if (!validateProducts(req.body)) return res.status(400).json({message:'Некорректный каталог'});
    if(req.get('X-Catalog-Revision')!==catalogRevision())return res.status(409).json({message:'Каталог уже изменён. Обновите каталог перед сохранением, чтобы не затереть новые правки.'});
    store.write('products',req.body.map(({stock,inStock,supplierAvailability,...product})=>product.supplier?{...product,minimumPriceRub:product.price}:product));res.json({success:true,revision:catalogRevision()});
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
    if (!u) return res.status(401).json({message:'Откройте магазин из бота @AIshopify1_bot в Telegram. Если окно уже открыто, закройте его, отправьте боту /start и откройте магазин снова.'});
    if (typeof b.email!=='string' || b.email.length>254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(b.email) || b.acceptOffer!==true) return res.status(400).json({message:'Укажите email и примите условия заказа'});
    if (b.acceptPrivacyConsent!==true || b.privacyConsentVersion!==PRIVACY_CONSENT_VERSION) return res.status(400).json({message:'Обновите приложение: закройте окно, отправьте боту /start и откройте магазин снова. Затем примите отдельное согласие на обработку данных.'});
    let order;
    try {
      let channelPercent=0;
      if (b.channelDiscount) {
        if (!u || claimed(u.id) || !await subscribed(u.id)) return res.status(409).json({message:'Скидка за подписку недоступна. Проверьте подписку повторно.'});
        channelPercent=5;
      }
      const existing=store.read('orders');
      if (channelPercent && existing.some(o=>o.channelPercent && String(o.telegramId)===String(u.id) && ['creating','pending','review'].includes(o.status))) return res.status(409).json({message:'У вас уже есть неоплаченный счёт со скидкой'});
      const available=store.read('products').filter(p=>p.active!==false);
      if(!Array.isArray(b.items)||b.items.some(i=>!available.some(p=>p.id===i?.id&&!p.priceOnRequest)))return res.status(409).json({message:'Товар отключён или доступен только по запросу. Обновите каталог. Счёт не создан.'});
      const quote=calculateOrder(b.items,available,b.promoCode,channelPercent,store.read('promos'));
      if (Number(b.expectedAmount)!==quote.amount) return res.status(409).json({message:'Цена изменилась. Обновите каталог и проверьте итог.'});
      const supplierChecks=await supplierCatalog.checkOrder(b.items,available);
      // Owner edits may have happened while the supplier request was in flight.
      if(JSON.stringify(available)!==JSON.stringify(store.read('products').filter(p=>p.active!==false)))return res.status(409).json({message:'Каталог изменился. Обновите товары перед оплатой. Счёт не создан.'});
      const createdAt=new Date().toISOString();
      order={id:`AI-${randomUUID()}`,accessToken:opaqueToken(),...quote,...(supplierChecks.length?{supplierChecks}:{}),email:b.email.trim(),telegramId:u?.id||null,telegramUsername:typeof u?.username==='string'?u.username:null,status:'creating',termsVersion:'2026-11-03',privacyConsent:{version:PRIVACY_CONSENT_VERSION,text:PRIVACY_CONSENT_TEXT,textSha256:createHash('sha256').update(PRIVACY_CONSENT_TEXT).digest('hex'),acceptedAt:createdAt},createdAt};
      store.saveOrder(order);
      const client_receipt=buildReceipt(order,config);
      const r=await fetchImpl(gateway,{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:auth(),'Content-Type':'application/json'},body:JSON.stringify({amount:quote.amount.toFixed(2),client_payment_id:order.id,method:'sbp',description:`Заказ ${order.id}`,client_receipt,metadata:{email:order.email,order_id:order.id}})});
      const data=await r.json();if (!r.ok || data.error) throw new Error('Gateway rejected');
      const p=data.data||data,qrUrl=gatewayLink(p?.payment_qr_urls),qrImage=gatewayLink(p?.payment_qr_images);
      if (!p?.id || !/^https:\/\//.test(qrUrl)) throw new Error('Invalid gateway response');
      Object.assign(order,{status:'pending',statusChangedAt:new Date().toISOString(),itpayId:p.id,qrUrl,qrImage,fiscalizationRequested:!!client_receipt,kassaConnected:p.kassa_connected===true});store.saveOrder(order);
      res.json({success:true,orderId:order.id,accessToken:order.accessToken,amount:order.amount,qrUrl,qrImage});
    } catch(error) {
      if (order) {order.status='review';order.statusChangedAt=new Date().toISOString();store.saveOrder(order);return res.status(502).json({message:`Не удалось подтвердить создание счёта. Обратитесь в поддержку с номером ${order.id}, не повторяйте оплату.`});}
      if([409,503].includes(error.status))return res.status(error.status).json({message:error.message});
      res.status(400).json({message:'Проверьте корзину и скидки'});
    }
  });
  async function reconcile(id) {
    if (reconciling.has(id)) return reconciling.get(id);
    const work=(async()=>{
      let order=store.read('orders').find(o=>o.id===id);
      if (!order || !order.itpayId) return order;
      const r=await fetchImpl(`${gateway}/${encodeURIComponent(order.itpayId)}`,{headers:{Authorization:auth()},signal:AbortSignal.timeout(10000)});
      if (!r.ok) throw new Error('Gateway unavailable');const result=await r.json(),p=result.data||result;
      if (String(p?.id)!==String(order.itpayId) || p?.client_payment_id!==order.id || Math.round(Number(p?.amount)*100)!==Math.round(order.amount*100) || (p.currency && p.currency!=='RUB') || !KNOWN_PAYMENT_STATUSES.includes(p.status)) throw new Error('Payment identity or status mismatch');
      order=store.read('orders').find(o=>o.id===id);
      order.receipts=Array.isArray(p.receipts)?p.receipts.map(r=>({id:r.id,state:r.state,url:gatewayLink(r.link_to_receipt)})):order.receipts||[];
      store.saveOrder(order);
      if (PAID_PAYMENT_STATUSES.includes(p.status) && order.status!=='paid') {
        order.status='paid';order.paidAt=new Date().toISOString();order.statusChangedAt=order.paidAt;order.buyerConfirmation={version:PURCHASE_CONFIRMATION_VERSION,state:'pending',createdAt:Date.now()};store.saveOrder(order);
        if (telegram && config.ADMIN_ID) try {await telegram.sendMessage(config.ADMIN_ID,`Оплачен заказ ${order.id}. Сумма ${order.amount} ₽. Покупатель: ${order.telegramUsername?'@'+order.telegramUsername:order.telegramId||'не указан'}; Telegram ID: ${order.telegramId||'не указан'}. Свяжитесь после оплаты; срок подключения согласуется после оплаты. Откройте защищённую панель заказов.`);} catch {console.error('Order notification failed');}
      } else if (order.status!=='paid' && CLOSED_UNPAID_PAYMENT_STATUSES.includes(p.status) && (order.status!==p.status || !order.statusChangedAt)) {order.status=p.status;order.statusChangedAt=new Date().toISOString();store.saveOrder(order);}
      if(order.status==='paid')try{await purchaseConfirmations.deliver(order.id);}catch{console.error('Buyer confirmation failed');}
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
