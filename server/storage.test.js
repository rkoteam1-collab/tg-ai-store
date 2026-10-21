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
