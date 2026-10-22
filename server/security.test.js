import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createApp} from './app.js';
import {telegramUser,calculateOrder,validateProducts} from './security.js';
import {buildReceipt} from './receipt.js';

const product={id:'claude-pro',name:'Claude Pro',price:2790,stock:10,inStock:true,features:[]};
const botToken='test-token-not-real';
function signed(id=42,age=0){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)-age),user:JSON.stringify({id})});
 const data=[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 p.set('hash',createHmac('sha256',createHmac('sha256','WebAppData').update(botToken).digest()).update(data).digest('hex'));return p.toString();
}
test('Telegram rejects tampering, expiry and duplicate fields',()=>{
 assert.equal(telegramUser(signed(),botToken).id,42);
 assert.equal(telegramUser(signed(42,4000),botToken),null);
 assert.equal(telegramUser(signed()+'&user='+encodeURIComponent('{"id":1}'),botToken),null);
 assert.equal(telegramUser(signed().replace('42','43'),botToken),null);
});
test('Server price wins, discounts round consistently',()=>{
 const q=calculateOrder([{id:product.id,quantity:2,price:1}], [product],'START',5);
 assert.equal(q.amount,4743);assert.equal(q.items[0].price,2790);
});
test('Reject unknown products, duplicate IDs, negative/fractional quantities and unknown promos',()=>{
 for(const items of [[{id:'no',quantity:1}],[{id:product.id,quantity:-1}],[{id:product.id,quantity:1.5}],[{id:product.id,quantity:11}],[{id:product.id,quantity:1},{id:product.id,quantity:1}]])assert.throws(()=>calculateOrder(items,[product]));
 assert.throws(()=>calculateOrder([{id:product.id,quantity:1}],[product],'FAKE'));
 assert.equal(validateProducts([{...product,price:-1}]),false);
});
test('Fiscal allocation sums exactly after discount and does not invent tax settings',()=>{
 const q={...calculateOrder([{id:product.id,quantity:3}],[product],'START',5),email:'buyer@example.com'};
 assert.equal(buildReceipt(q,{}),undefined);
 const receipt=buildReceipt(q,{ITPAY_TAXATION_SYSTEM:'1',ITPAY_VAT:'6',ITPAY_RECEIPT_TYPE:'1',ITPAY_RECEIPT_OBJECT:'4'});
 assert.equal(receipt.customer_email,q.email);
 assert.equal(receipt.items.reduce((sum,i)=>sum+Math.round(Number(i.price)*100),0),q.amount*100);
});

async function fixture(t,extra={}) {
 const db={products:[{...product}],orders:[],channel_discounts:[],promos:[{code:'START',discountPercent:10,active:true}]};
 const store={read:n=>structuredClone(db[n]||[]),write:(n,v)=>{db[n]=structuredClone(v);},saveOrder:o=>{const i=db.orders.findIndex(x=>x.id===o.id);if(i<0)db.orders.push(structuredClone(o));else db.orders[i]=structuredClone(o);}};
 let gatewayStatus='new',wrongAmount=false,posts=0,notifies=0;
 const config={BOT_TOKEN:botToken,ADMIN_ID:'42',ADMIN_PIN:'test-password-long',ALFA_SBP_ID:'test',ALFA_SBP_KEY:'test',...extra};
 const fetchImpl=async(url,opts)=>{
  if(opts.method==='POST'){posts++;const b=JSON.parse(opts.body);return {ok:true,json:async()=>({id:'bank-'+posts,amount:b.amount,client_payment_id:b.client_payment_id,payment_qr_urls:{desktop:'https://example.com/pay'},payment_qr_images:'https://example.com/qr.png',status:'new',kassa_connected:true})};}
  const order=db.orders.find(o=>url.endsWith(o.itpayId));
  return {ok:true,json:async()=>({id:order.itpayId,client_payment_id:order.id,amount:wrongAmount?'1.00':order.amount.toFixed(2),currency:'RUB',status:gatewayStatus,receipts:[]})};
 };
 const telegram={getChatMember:async()=>({status:'member'}),sendMessage:async()=>{notifies++;}};
 const server=createApp({config,store,telegram,fetchImpl}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port;
 async function req(route,body,headers={}){const r=await fetch(url+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
 return {url,db,req,state:(status,mismatch=false)=>{gatewayStatus=status;wrongAmount=mismatch;},stats:()=>({posts,notifies})};
}
const valid={email:'buyer@example.com',acceptOffer:true,expectedAmount:2790,items:[{id:'claude-pro',quantity:1}]};
test('Catalog and orders require server-issued admin session, forged frontend flags do not count',async t=>{
 const f=await fixture(t);
 assert.equal((await f.req('/api/products',[product])).status,401);
 assert.equal((await f.req('/api/admin/orders',{})).status,401);
 assert.equal((await f.req('/api/admin/verify',{pin:'7788'})).status,401);
 const login=await f.req('/api/admin/verify',{pin:'test-password-long'});
 const h={Authorization:'Bearer '+login.data.token,'X-Catalog-Revision':(await f.req('/api/catalog')).data.revision};
 assert.equal((await f.req('/api/products',[product],h)).status,200);
 assert.equal((await f.req('/api/products',[{...product,price:0}],h)).status,400);
 await f.req('/api/admin/logout',{},h);
 assert.equal((await f.req('/api/admin/orders',{},h)).status,401);
});
test('Client total manipulation and fake identity cannot create underpriced payment',async t=>{
 const f=await fixture(t);
 assert.equal((await f.req('/api/payments/create',{...valid,expectedAmount:1,amount:1})).status,409);
 const created=await f.req('/api/payments/create',{...valid,telegramId:42,username:'admin'});
 assert.equal(created.status,200);assert.equal(created.data.amount,2790);assert.equal(f.db.orders[0].telegramId,null);
 assert.equal(f.stats().posts,1);
});
test('Order status is private, callback is reconciled against bank, paid notification is idempotent',async t=>{
 const f=await fixture(t),created=(await f.req('/api/payments/create',valid)).data;
 const route='/api/payments/status/'+created.orderId,h={'X-Order-Token':created.accessToken};
 assert.equal((await f.req(route)).status,404);
 assert.equal((await f.req(route,undefined,{'X-Order-Token':'fake'})).status,404);
 await f.req('/api/payments/alfa/webhook',{event:'payment.pay',data:{client_payment_id:created.orderId,status:'paid'}});
 assert.equal(f.db.orders[0].status,'pending');
 f.state('paid',true);
 assert.equal((await f.req('/api/payments/alfa/webhook',{data:{client_payment_id:created.orderId}})).status,503);
 assert.equal(f.db.orders[0].status,'pending');
 f.state('paid');
 await Promise.all([f.req('/api/payments/alfa/webhook',{data:{client_payment_id:created.orderId}}),f.req(route,undefined,h)]);
 await f.req('/api/payments/alfa/webhook',{event:'payment.receipt',data:{client_payment_id:created.orderId}});
 assert.equal(f.db.orders[0].status,'paid');assert.equal(f.stats().notifies,1);
 const status=(await f.req(route,undefined,h)).data;
 assert.equal(status.status,'paid');assert.equal(status.email,undefined);assert.equal(status.order,undefined);
});
test('Subscription checks do not consume discount; completed payment consumes it',async t=>{
 const f=await fixture(t),h={'X-Telegram-Init-Data':signed()};
 assert.equal((await f.req('/api/check-subscription',{},h)).data.success,true);
 assert.equal((await f.req('/api/check-subscription',{},h)).data.success,true);
 assert.equal(f.db.channel_discounts.length,0);
 const created=(await f.req('/api/payments/create',{...valid,channelDiscount:true,expectedAmount:2650},h)).data;
 assert.ok(created.orderId);f.state('paid');await f.req('/api/payments/status/'+created.orderId,undefined,h);
 assert.equal((await f.req('/api/check-subscription',{},h)).data.alreadyClaimed,true);
});
test('Reserved stock cannot be oversold by concurrent requests',async t=>{
 const f=await fixture(t);f.db.products[0].stock=1;
 const replies=await Promise.all([f.req('/api/payments/create',valid),f.req('/api/payments/create',valid)]);
 assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);assert.equal(f.stats().posts,1);
});
test('Unknown API route is JSON 404, not SPA success',async t=>{
 const f=await fixture(t);assert.equal((await f.req('/api/unknown')).status,404);
});
test('Admin can create, disable, remove promos; checkout revalidates against storage',async t=>{
 const f=await fixture(t);
 assert.equal((await f.req('/api/admin/promos',[])).status,401);
 const login=await f.req('/api/admin/verify',{pin:'test-password-long'}),h={Authorization:'Bearer '+login.data.token};
 assert.equal((await f.req('/api/admin/promos',[{code:'NEW25',discountPercent:25,active:true}],h)).status,200);
 assert.equal((await f.req('/api/promos/validate',{code:'new25'})).data.discountPercent,25);
 assert.equal((await f.req('/api/payments/create',{...valid,promoCode:'NEW25',expectedAmount:2092})).status,200);
 await f.req('/api/admin/promos',[{code:'NEW25',discountPercent:25,active:false}],h);
 assert.equal((await f.req('/api/promos/validate',{code:'NEW25'})).status,400);
 assert.equal((await f.req('/api/payments/create',{...valid,promoCode:'NEW25',expectedAmount:2092})).status,400);
 await f.req('/api/admin/promos',[],h);
 assert.deepEqual((await f.req('/api/admin/promos',undefined,h)).data,[]);
 assert.equal((await f.req('/api/admin/promos',[{code:'BAD',discountPercent:100,active:true}],h)).status,400);
});

test('CDN preflight permits only the configured storefront origin',async t=>{
 const f=await fixture(t);
 const good=await fetch(f.url+'/api/products',{method:'OPTIONS',headers:{Origin:'https://rkoteam1-collab.github.io','Access-Control-Request-Method':'GET'}});
 assert.equal(good.status,204);assert.equal(good.headers.get('Access-Control-Allow-Origin'),'https://rkoteam1-collab.github.io');
 const bad=await fetch(f.url+'/api/products',{method:'OPTIONS',headers:{Origin:'https://untrusted.example','Access-Control-Request-Method':'POST'}});
 assert.equal(bad.status,403);assert.equal(bad.headers.get('Access-Control-Allow-Origin'),null);
});

test('Stale admin cannot restore stock; disabled product never creates a bank invoice',async t=>{
 const f=await fixture(t);const login=await f.req('/api/admin/verify',{pin:'test-password-long'});
 const revision=(await f.req('/api/catalog')).data.revision;
 const headers={Authorization:'Bearer '+login.data.token,'X-Catalog-Revision':revision};
 assert.equal((await f.req('/api/products',[{...product,inStock:false,stock:0}],headers)).status,200);
 assert.equal((await f.req('/api/products',[product],headers)).status,409);
 assert.equal((await f.req('/api/payments/create',valid)).status,409);
 assert.equal(f.stats().posts,0);assert.equal(f.db.orders.length,0);
 assert.equal((await f.req('/api/products')).data[0].inStock,false);
});

test('Production manual fulfillment requires verified Telegram account before creating invoice',async t=>{
 const f=await fixture(t,{RENDER:'true'});
 assert.equal((await f.req('/api/payments/create',valid)).status,401);assert.equal(f.stats().posts,0);
 assert.equal((await f.req('/api/payments/create',valid,{'X-Telegram-Init-Data':signed()})).status,200);
 assert.equal(f.db.orders[0].telegramId,42);
});

test('Combined discounts cannot lower Max checkout below its configured floor, including mixed carts',()=>{
 const max={...product,id:'claude-max',price:12080,minimumPriceRub:12080};
 assert.equal(calculateOrder([{id:max.id,quantity:1}],[max],'VIPAI',5).amount,12080);
 assert.equal(calculateOrder([{id:max.id,quantity:2}],[max],'VIPAI',5).amount,24160);
 assert.equal(calculateOrder([{id:max.id,quantity:1}],[max],'VIPAI',5).channelPercent,0);
 const mixed=calculateOrder([{id:max.id,quantity:1},{id:product.id,quantity:1}],[max,product],'VIPAI',5);
 assert.equal(mixed.amount,14172);assert.equal(validateProducts([{...max,price:9590}]),false);
});
