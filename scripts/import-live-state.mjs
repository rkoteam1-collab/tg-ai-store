import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateProducts,validatePromos} from '../server/security.js';

const input=process.env.MIGRATION_INPUT_DIR;
const target=process.env.DATA_DIR;
if(!input||!target||!path.isAbsolute(target))throw new Error('Set MIGRATION_INPUT_DIR and absolute DATA_DIR');
const manifest=JSON.parse(fs.readFileSync(path.join(input,'manifest.json'),'utf8'));
const names=['products','promos','orders','channel_discounts'];
const data={};
for(const name of names){
  const bytes=fs.readFileSync(path.join(input,`${name}.json`));
  if(createHash('sha256').update(bytes).digest('hex')!==manifest.files?.[name])throw new Error(`Checksum mismatch: ${name}`);
  data[name]=JSON.parse(bytes);
  if(!Array.isArray(data[name]))throw new Error(`Invalid data: ${name}`);
}
if(!validateProducts(data.products)||!validatePromos(data.promos))throw new Error('Invalid catalog or promos');
if(data.orders.length!==0||manifest.orders!==0)throw new Error('This importer only accepts the verified zero-order migration');
fs.mkdirSync(target,{recursive:true,mode:0o700});
for(const name of names)if(fs.existsSync(path.join(target,`${name}.json`)))throw new Error(`Target is not empty: ${name}`);
for(const name of names)fs.copyFileSync(path.join(input,`${name}.json`),path.join(target,`${name}.json`),fs.constants.COPYFILE_EXCL);
for(const name of names)fs.chmodSync(path.join(target,`${name}.json`),0o600);
console.log(JSON.stringify({imported:true,products:data.products.length,promos:data.promos.length,orders:0}));
