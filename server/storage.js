import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
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
  const promoSeed=path.join(path.dirname(seedPath),'promos.seed.json');
  if (!fs.existsSync(path.join(directory,'promos.json'))) write('promos',JSON.parse(fs.readFileSync(promoSeed,'utf8')));
  return {read,write,saveOrder(order) {
    const all=read('orders'), i=all.findIndex(o=>o.id===order.id);
    if (i<0) all.unshift(order); else all[i]=order;
    write('orders',all);
  }};
}
