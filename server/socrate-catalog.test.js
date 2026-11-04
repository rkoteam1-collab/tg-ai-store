import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSocrateCatalog} from './socrate-catalog.js';
import {socrateProducts} from './socrate-products.js';
import {createStore} from './storage.js';
import {createApp} from './app.js';
import {calculateOrder,validateProducts} from './security.js';
import {canOrderProduct,availabilityMessage} from '../shared/product-availability.js';
import {PRIVACY_CONSENT_VERSION} from '../shared/privacyConsent.js';
const supplierProduct=socrateProducts.find(p=>p.supplierSku==='g-4');
const source=(overrides={})=>({sku:'g-4',unit_price_minor:56900,available_quantity:2,max_quantity:100,currency:'RUB',delivery_type:'text',...overrides});
function fixture(){
 let now=100000,products=[source()],fail=false;const calls=[];
 const service=createSocrateCatalog({config:{SOCRATE_API_KEY:'test-only-supplier-secret'},clock:()=>now,fetchImpl:async(url,options)=>{calls.push({url,options});if(fail)throw Error('offline');return {ok:true,json:async()=>({products})};}});
 return {service,calls,advance:n=>{now+=n;},now:()=>now,setProducts:p=>{products=p;},fail:()=>{fail=true;}};
}
test('Supplier catalog is cached and single-flight; only fixed-host GET receives the key',async()=>{
 const f=fixture();await Promise.all([f.service.refresh(),f.service.refresh(),f.service.refresh()]);assert.equal(f.calls.length,1);
 await f.service.refresh();assert.equal(f.calls.length,1);
 const call=f.calls[0];assert.equal(call.url,'https://api.socrate.store/v1/products?language=ru');assert.equal(call.options.redirect,'error');assert.equal(call.options.body,undefined);assert.equal(call.options.method,undefined);
 assert.equal(call.options.headers['X-API-Key'],'test-only-supplier-secret');
 const [p]=f.service.decorate([supplierProduct]);assert.equal(p.supplierAvailability.state,'available');assert.equal(p.supplierAvailability.quantity,2);assert.equal(p.price,849);assert.equal(p.supplierMaxUnitPriceMinor,undefined);
 assert(!JSON.stringify(p).includes('test-only-supplier-secret'));
 f.advance(30000);await f.service.refresh();assert.equal(f.calls.length,2);
});
test('Zero stock, disappearance and increased supplier prices block only supplier items',async()=>{
 const f=fixture();
 for(const [products,state]of [[[source({available_quantity:0})],'out_of_stock'],[[],'unavailable'],[[source({unit_price_minor:57000})],'price_review']]){
  f.setProducts(products);await f.service.refresh(true);const decorated=f.service.decorate([supplierProduct,{id:'manual',price:10,active:true}]);assert.equal(decorated[0].supplierAvailability.state,state);assert.equal(canOrderProduct(decorated[0],1,f.now()),false);assert.equal(canOrderProduct(decorated[1]),true);
 }
});
test('Supplier 429 respects Retry-After and does not turn a missing result into stock',async()=>{
 let now=100000,calls=0;
 const service=createSocrateCatalog({config:{SOCRATE_API_KEY:'test-only-secret'},clock:()=>now,fetchImpl:async()=>{calls++;return {ok:false,status:429,headers:{get:()=> '120'}};}});
 await service.refresh();now+=60000;await service.refresh(true);assert.equal(calls,1);assert.equal(service.decorate([supplierProduct])[0].supplierAvailability.state,'unknown');
 now+=60000;await service.refresh(true);assert.equal(calls,2);
});
test('An expired, unavailable, unconfigured or invalid catalog never exposes stale available stock',async()=>{
 const f=fixture();await f.service.refresh();f.advance(45001);const [expired]=f.service.decorate([supplierProduct]);assert.equal(expired.supplierAvailability.state,'unknown');assert.equal(canOrderProduct(expired,1,f.now()),false);
 await f.service.refresh(true);f.fail();await f.service.refresh(true);assert.equal(f.service.decorate([supplierProduct])[0].supplierAvailability.state,'unknown');
 let calls=0;const disabled=createSocrateCatalog({fetchImpl:async()=>{calls++;}});await disabled.refresh();assert.equal(calls,0);assert.equal(disabled.decorate([supplierProduct])[0].supplierAvailability.state,'unknown');
 for(const bad of [source({currency:'USD'}),source({available_quantity:-1}),source({available_quantity:1.5}),source({unit_price_minor:'56900'}),source({delivery_type:'file'})]){
  const service=createSocrateCatalog({config:{SOCRATE_API_KEY:'test-only-secret'},fetchImpl:async()=>({ok:true,json:async()=>({products:[bad]})})});await service.refresh();assert.equal(service.decorate([supplierProduct])[0].supplierAvailability.state,'unknown');
 }
});
test('Checkout always refreshes supplier stock and enforces the requested quantity and cost ceiling',async()=>{
 const f=fixture();await f.service.refresh();const catalog=[supplierProduct];const items=[{id:supplierProduct.id,quantity:2}];
 const checks=await f.service.checkOrder(items,catalog);assert.equal(f.calls.length,2);assert.equal(checks[0].unitPriceMinor,56900);assert.equal(checks[0].sku,'g-4');
 f.setProducts([source({available_quantity:1})]);await assert.rejects(f.service.checkOrder(items,catalog),e=>e.status===409);
 f.setProducts([source({unit_price_minor:60000})]);await assert.rejects(f.service.checkOrder([{...items[0],quantity:1}],catalog),e=>e.status===409);
 assert.deepEqual(await f.service.checkOrder([{id:'manual',quantity:1}],[{id:'manual'}]),[]);
});
test('Supplier retail prices survive upstream changes and cannot be discounted below retail in a mixed cart',()=>{
 assert.equal(validateProducts(socrateProducts),true);
 const manual={id:'manual',name:'Manual',price:1000,active:true,features:[]};
 const q=calculateOrder([{id:supplierProduct.id,quantity:1},{id:manual.id,quantity:1}],[{...supplierProduct,minimumPriceRub:0},manual],'VIPAI',5);
 assert.equal(q.amount,849+750);assert.equal(q.items[0].price,849);
 assert.equal(socrateProducts.length,13);assert(socrateProducts.every(p=>!['g-8','g-16','g-28','g-29'].includes(p.supplierSku)));
 assert(socrateProducts.every(p=>!/(гаранти|warranty)/i.test(JSON.stringify(p))));
});
test('Supplier import preserves owner changes and does not revive deleted or disabled cards on restart',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ai-supplier-migration-'));
 try{
  const seed=fileURLToPath(new URL('./data/products.json',import.meta.url));const initial=JSON.parse(fs.readFileSync(seed,'utf8'));initial[0]={...initial[0],price:2345,active:false};fs.writeFileSync(path.join(directory,'products.json'),JSON.stringify(initial));
  const first=createStore(directory,seed);assert.equal(first.read('products').length,initial.length+13);assert.equal(first.read('products')[0].price,2345);assert.equal(first.read('products')[0].active,false);
  first.write('products',first.read('products').filter(p=>p.supplierSku!=='g-4').map(p=>p.supplierSku==='g-30'?{...p,price:2700,active:false}:p));
  const second=createStore(directory,seed).read('products');assert(!second.some(p=>p.supplierSku==='g-4'));assert.equal(second.find(p=>p.supplierSku==='g-30').price,2700);assert.equal(second.find(p=>p.supplierSku==='g-30').active,false);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
function signed(){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:42})});const text=[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');p.set('hash',createHmac('sha256',createHmac('sha256','WebAppData').update('test-token').digest()).update(text).digest('hex'));return p.toString();}
async function httpFixture(t,{key=true}={}){
 const db={products:[{...supplierProduct}],orders:[],promos:[],channel_discounts:[]};let quantity=2,cost=56900,failed=false,bankPosts=0,supplierPosts=0,editOnRead=false;
 const store={read:name=>structuredClone(db[name]||[]),write:(name,value)=>{db[name]=structuredClone(value);},saveOrder:o=>{const i=db.orders.findIndex(v=>v.id===o.id);if(i<0)db.orders.push(structuredClone(o));else db.orders[i]=structuredClone(o);}};
 const fetchImpl=async(url,options={})=>{
  if(url.startsWith('https://api.socrate.store/')){
   if(options.method&&options.method!=='GET')supplierPosts++;
   if(failed)throw Error('offline');
   if(editOnRead)db.products[0].active=false;
   return {ok:true,json:async()=>({products:[source({available_quantity:quantity,unit_price_minor:cost})]})};
  }
  bankPosts++;const body=JSON.parse(options.body);return {ok:true,json:async()=>({id:'bank-1',amount:body.amount,client_payment_id:body.client_payment_id,payment_qr_urls:{desktop:'https://example.com/pay'}})};
 };
 const app=createApp({store,config:{BOT_TOKEN:'test-token',ALFA_SBP_ID:'test',ALFA_SBP_KEY:'test',...(key?{SOCRATE_API_KEY:'test-only-secret'}:{})},fetchImpl});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port;
 async function request(route,body){const r=await fetch(url+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Telegram-Init-Data':signed()},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
 const valid={email:'test@example.com',acceptOffer:true,acceptPrivacyConsent:true,privacyConsentVersion:PRIVACY_CONSENT_VERSION,expectedAmount:849,items:[{id:supplierProduct.id,quantity:1}]};
 return {app,db,request,valid,set:(q,c=56900)=>{quantity=q;cost=c;},fail:()=>{failed=true;},edit:()=>{editOnRead=true;},stats:()=>({bankPosts,supplierPosts})};
}
test('HTTP checkout rejects forged browser availability, supplier price rises and outages before creating a bank invoice',async t=>{
 const f=await httpFixture(t);f.set(0);
 assert.equal((await f.request('/api/payments/create',{...f.valid,items:[{...f.valid.items[0],inStock:true,available_quantity:999}]})).status,409);
 f.set(2,57000);assert.equal((await f.request('/api/payments/create',f.valid)).status,409);
 f.fail();assert.equal((await f.request('/api/payments/create',f.valid)).status,503);
 assert.equal(f.stats().bankPosts,0);assert.equal(f.stats().supplierPosts,0);assert.equal(f.db.orders.length,0);
});
test('HTTP checkout stores supplier evidence, charges retail and makes no supplier purchase',async t=>{
 const f=await httpFixture(t);const result=await f.request('/api/payments/create',f.valid);assert.equal(result.status,200);assert.equal(result.body.amount,849);assert.equal(f.stats().bankPosts,1);assert.equal(f.stats().supplierPosts,0);
 assert.equal(f.db.orders[0].supplierChecks[0].unitPriceMinor,56900);
 const catalog=await f.request('/api/catalog');assert.equal(catalog.body.products[0].supplierAvailability.state,'available');assert.equal(catalog.body.products[0].supplierMaxUnitPriceMinor,undefined);assert(!JSON.stringify(catalog).includes('test-only-secret'));
});
test('HTTP checkout without a configured key or with a concurrent owner edit never creates an invoice',async t=>{
 const f=await httpFixture(t,{key:false});assert.equal((await f.request('/api/payments/create',f.valid)).status,503);assert.equal(f.stats().bankPosts,0);
 const g=await httpFixture(t);g.edit();assert.equal((await g.request('/api/payments/create',g.valid)).status,409);assert.equal(g.stats().bankPosts,0);
});
test('Client availability expires and quantity changes cannot bypass the supplier limit',()=>{
 const p={...supplierProduct,supplierAvailability:{state:'available',quantity:2,validUntil:2000}};
 assert.equal(canOrderProduct(p,2,1000),true);assert.equal(canOrderProduct(p,3,1000),false);assert.equal(canOrderProduct(p,1,2000),false);assert.equal(availabilityMessage(p,2000),'Наличие уточняется');
});
