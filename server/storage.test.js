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
