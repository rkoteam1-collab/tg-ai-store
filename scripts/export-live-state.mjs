import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const base=process.env.MIGRATION_SOURCE_URL;
const pin=process.env.MIGRATION_ADMIN_PIN;
const output=process.env.MIGRATION_OUTPUT_DIR;
if(!base||!pin||!output)throw new Error('Set MIGRATION_SOURCE_URL, MIGRATION_ADMIN_PIN and MIGRATION_OUTPUT_DIR');
if(fs.existsSync(output))throw new Error('Output directory already exists; choose a new location');
const origin=new URL(base);
if(origin.protocol!=='https:')throw new Error('Migration source must use HTTPS');
async function api(route,options={}){
  const response=await fetch(new URL(route,origin),{...options,signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json',...options.headers}});
  if(!response.ok)throw new Error(`Migration API ${route} failed: HTTP ${response.status}`);
  return response.json();
}
const login=await api('/api/admin/verify',{method:'POST',body:JSON.stringify({pin})});
const headers={Authorization:`Bearer ${login.token}`};
const [products,promos,orders]=await Promise.all([
  api('/api/products'),
  api('/api/admin/promos',{headers}),
  api('/api/admin/orders',{method:'POST',headers,body:'{}'})
]);
if(!Array.isArray(products)||!Array.isArray(promos)||!Array.isArray(orders))throw new Error('Invalid source data');
// The regular orders endpoint hides access tokens. Never silently export incomplete paid orders.
if(orders.length)throw new Error('Orders exist; migration needs a complete protected export before cutover');
const absolute=path.resolve(output);
fs.mkdirSync(absolute,{recursive:false,mode:0o700});
const files={products,promos,orders:[],channel_discounts:[]};
const hashes={};
for(const [name,data] of Object.entries(files)){
  const content=JSON.stringify(data,null,2)+'\n';
  const target=path.join(absolute,`${name}.json`);
  fs.writeFileSync(target,content,{mode:0o600,flag:'wx'});
  hashes[name]=createHash('sha256').update(content).digest('hex');
}
fs.writeFileSync(path.join(absolute,'manifest.json'),JSON.stringify({exportedAt:new Date().toISOString(),source:origin.origin,orders:0,files:hashes},null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({exported:true,products:products.length,promos:promos.length,orders:0,output:absolute}));
