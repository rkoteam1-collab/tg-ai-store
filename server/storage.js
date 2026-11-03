import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {redactExpiredOrderContacts} from './privacy-retention.js';
// One process, one persistent volume. Corrupt files fail closed.
export function createStore(directory,seedPath) {
  fs.mkdirSync(directory,{recursive:true});
  function write(name,data) {
    const file=path.join(directory,`${name}.json`), temp=`${file}.${randomUUID()}.tmp`;
    const fd=fs.openSync(temp,'wx',0o600);
    try {fs.writeFileSync(fd,JSON.stringify(data,null,2));fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
    fs.renameSync(temp,file);
  }
  function read(name) {
    const file=path.join(directory,`${name}.json`);
    if (!fs.existsSync(file)) return [];
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    if (!Array.isArray(data)) throw new Error('Invalid store');
    return data;
  }
  if (!fs.existsSync(path.join(directory,'products.json'))) write('products',JSON.parse(fs.readFileSync(seedPath,'utf8')));
  // Stock was an obsolete deployment guard. Keep owner edits and explicit
  // active:false choices while migrating old catalogs to manual fulfillment.
  const products=read('products');
  if(products.some(p=>Object.hasOwn(p,'stock')||Object.hasOwn(p,'inStock')||p.active===undefined)){
    write('products',products.map(({stock,inStock,...product})=>({...product,active:product.active!==false})));
  }
  const promoSeed=path.join(path.dirname(seedPath),'promos.seed.json');
  if (!fs.existsSync(path.join(directory,'promos.json'))) write('promos',JSON.parse(fs.readFileSync(promoSeed,'utf8')));
  return {read,write,redactExpiredContacts(now=Date.now()) {
    const result=redactExpiredOrderContacts(read('orders'),now);
    if(result.changed) write('orders',result.orders);
    return result.changed;
  },saveOrder(order) {
    const all=read('orders'), i=all.findIndex(o=>o.id===order.id);
    if (i<0) all.unshift(order); else all[i]=order;
    write('orders',all);
  }};
}
