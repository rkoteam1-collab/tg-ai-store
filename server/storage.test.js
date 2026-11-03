import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStore} from './storage.js';
test('Disk storage retains promo edits across reopen and rejects corrupt data',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ai-store-test-'));
 try {
  const seed=fileURLToPath(new URL('./data/products.json',import.meta.url));
  const first=createStore(directory,seed);
  first.write('promos',[{code:'PERSIST',discountPercent:12,active:true}]);
  const second=createStore(directory,seed);
  assert.equal(second.read('promos')[0].code,'PERSIST');
  second.write('promos',[]);
  assert.deepEqual(createStore(directory,seed).read('promos'),[]);
  fs.writeFileSync(path.join(directory,'promos.json'),'{broken');
  assert.throws(()=>second.read('promos'));
 } finally {fs.rmSync(directory,{recursive:true,force:true});}
});

test('Legacy inventory migration keeps owner edits and explicit active:false; fresh deployments remain orderable',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ai-inventory-test-'));
 const fresh=fs.mkdtempSync(path.join(os.tmpdir(),'ai-fresh-test-'));
 try{
  const seed=fileURLToPath(new URL('./data/products.json',import.meta.url));
  const products=JSON.parse(fs.readFileSync(seed,'utf8'));
  const legacy=products.map((p,i)=>({...p,price:i===0?2290:p.price,stock:0,inStock:false,active:i===0?false:undefined}));
  fs.writeFileSync(path.join(directory,'products.json'),JSON.stringify(legacy));
  const store=createStore(directory,seed),migrated=store.read('products');
  assert.equal(migrated[0].price,2290);
  assert.equal(migrated[0].active,false);
  assert(migrated.slice(1).every(p=>p.active===true));
  assert(migrated.every(p=>!('stock' in p)&&!('inStock' in p)));
  assert.deepEqual(createStore(directory,seed).read('products'),migrated);
  assert(createStore(fresh,seed).read('products').filter(p=>!p.priceOnRequest).every(p=>p.active!==false));
  assert.equal(fs.existsSync(path.join(directory,'inventory-confirmed.json')),false);
 }finally{
  fs.rmSync(directory,{recursive:true,force:true});
  fs.rmSync(fresh,{recursive:true,force:true});
 }
});

test('Retention removes old contact details but preserves payment evidence and unresolved orders',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ai-retention-test-'));
 try {
  const seed=fileURLToPath(new URL('./data/products.json',import.meta.url));
  const store=createStore(directory,seed);
  const details={email:'buyer@example.com',telegramId:42,telegramUsername:'buyer',accessToken:'private',qrUrl:'https://example.com/qr',privacyConsent:{text:'accepted'},buyerConfirmation:{version:1,state:'sent',messageId:123},itpayId:'bank-1',amount:2190,items:[{id:'claude-pro',quantity:1}]};
  store.saveOrder({id:'paid',...details,status:'paid',paidAt:'2020-04-01T00:00:00.000Z'});
  store.saveOrder({id:'cancelled',...details,status:'cancelled',statusChangedAt:'2025-01-01T00:00:00.000Z'});
  store.saveOrder({id:'rejected',...details,status:'rejected',statusChangedAt:'2025-01-01T00:00:00.000Z'});
  store.saveOrder({id:'error',...details,status:'error',statusChangedAt:'2025-01-01T00:00:00.000Z'});
  store.saveOrder({id:'pending',...details,status:'pending',createdAt:'2020-01-01T00:00:00.000Z'});
  store.saveOrder({id:'legacy',...details,status:'paid'});
  assert.equal(store.redactExpiredContacts(Date.parse('2025-01-31T00:00:00.000Z')),false);
  assert.equal(store.redactExpiredContacts(Date.parse('2026-01-01T00:00:00.000Z')),true);
  const rows=createStore(directory,seed).read('orders');
  for(const id of ['paid','cancelled','rejected','error']){
    const row=rows.find(o=>o.id===id);
    assert.equal(row.email,null);assert.equal(row.telegramId,null);assert.equal(row.accessToken,null);
    assert.equal(row.privacyConsent,null);assert.equal(row.buyerConfirmation,null);assert.equal(row.itpayId,'bank-1');assert.equal(row.amount,2190);
  }
  assert.equal(rows.find(o=>o.id==='pending').email,'buyer@example.com');
  assert.equal(rows.find(o=>o.id==='legacy').email,'buyer@example.com');
  assert.equal(store.redactExpiredContacts(Date.parse('2026-01-02T00:00:00.000Z')),false);
 } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
