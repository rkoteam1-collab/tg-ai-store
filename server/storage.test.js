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

test('Fresh ephemeral deployment disables seeded inventory, existing edits survive process reopen',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ai-inventory-test-'));
 try{const seed=fileURLToPath(new URL('./data/products.json',import.meta.url));
 const store=createStore(directory,seed,{ephemeralInventory:true});assert(store.read('products').every(p=>p.inStock===false));
 const catalog=store.read('products').map(p=>({...p,inStock:true}));store.write('products',catalog);
 assert(createStore(directory,seed,{ephemeralInventory:true}).read('products').every(p=>p.inStock===true));
 fs.copyFileSync(seed,path.join(directory,'products.json'));fs.unlinkSync(path.join(directory,'inventory-confirmed.json'));
 assert(createStore(directory,seed,{ephemeralInventory:true}).read('products').every(p=>p.inStock===false));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('Retention removes old contact details but preserves payment evidence and unresolved orders',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ai-retention-test-'));
 try {
  const seed=fileURLToPath(new URL('./data/products.json',import.meta.url));
  const store=createStore(directory,seed);
  const details={email:'buyer@example.com',telegramId:42,telegramUsername:'buyer',accessToken:'private',qrUrl:'https://example.com/qr',privacyConsent:{text:'accepted'},itpayId:'bank-1',amount:2190,items:[{id:'claude-pro',quantity:1}]};
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
    assert.equal(row.privacyConsent,null);assert.equal(row.itpayId,'bank-1');assert.equal(row.amount,2190);
  }
  assert.equal(rows.find(o=>o.id==='pending').email,'buyer@example.com');
  assert.equal(rows.find(o=>o.id==='legacy').email,'buyer@example.com');
  assert.equal(store.redactExpiredContacts(Date.parse('2026-01-02T00:00:00.000Z')),false);
 } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
