import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const source=process.env.DATA_DIR;
const root=process.env.BACKUP_DIR;
if(!source||!root||!path.isAbsolute(source)||!path.isAbsolute(root))throw new Error('Set absolute DATA_DIR and BACKUP_DIR');
const destination=path.join(root,new Date().toISOString().replaceAll(':','-'));
fs.mkdirSync(destination,{recursive:true,mode:0o700});
const names=['products','promos','orders','channel_discounts','inventory-confirmed'];
const hashes={};
for(const name of names){
  const file=path.join(source,`${name}.json`);
  if(!fs.existsSync(file))continue;
  const bytes=fs.readFileSync(file);
  JSON.parse(bytes);
  fs.writeFileSync(path.join(destination,`${name}.json`),bytes,{mode:0o600,flag:'wx'});
  hashes[name]=createHash('sha256').update(bytes).digest('hex');
}
if(!hashes.products||!hashes.promos)throw new Error('Incomplete backup: products or promos missing');
fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),files:hashes},null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({backupCreated:true,destination,files:Object.keys(hashes)}));
