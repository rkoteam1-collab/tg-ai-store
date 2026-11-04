const CATALOG_URL='https://api.socrate.store/v1/products?language=ru';
const TTL=30000,MAX_AGE=45000,RETRY_DELAY=5000;
export function createSocrateCatalog({config={},fetchImpl=fetch,clock=Date.now}={}) {
 let snapshot=null,inflight=null,retryAt=0,lastError=null;
 const configured=()=>typeof config.SOCRATE_API_KEY==='string'&&config.SOCRATE_API_KEY.length>10;
 async function refresh(force=false){
  if(!configured())return false;
  if(inflight)return inflight;
  if(clock()<retryAt)return false;
  if(!force&&snapshot&&clock()-snapshot.checkedAt<TTL)return true;
  const work=(async()=>{
   let cooldown=RETRY_DELAY;
   try{
    const response=await fetchImpl(CATALOG_URL,{headers:{'X-API-Key':config.SOCRATE_API_KEY,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(4000)});
    if(!response.ok){
     if(response.status===429){const seconds=Number(response.headers?.get?.('Retry-After'));if(Number.isFinite(seconds)&&seconds>0)cooldown=Math.min(3600000,Math.max(RETRY_DELAY,seconds*1000));}
     throw new Error('Supplier unavailable');
    }
    const data=await response.json();
    if(!Array.isArray(data.products)||data.products.length>2000)throw new Error('Invalid catalog');
    const products=new Map();
    for(const p of data.products){
     if(!/^g-[1-9][0-9]*$/.test(p?.sku)||products.has(p.sku)||p.currency!=='RUB'||p.delivery_type!=='text'||!Number.isSafeInteger(p.unit_price_minor)||p.unit_price_minor<0||!Number.isSafeInteger(p.available_quantity)||p.available_quantity<0||!Number.isSafeInteger(p.max_quantity)||p.max_quantity<1||p.max_quantity>100)throw new Error('Invalid product');
     products.set(p.sku,{costMinor:p.unit_price_minor,quantity:p.available_quantity,maxQuantity:p.max_quantity});
    }
    snapshot={products,checkedAt:clock()};lastError=null;retryAt=0;return true;
   }catch{snapshot=null;lastError='unavailable';retryAt=clock()+cooldown;return false;}
  })();
  inflight=work;try{return await work;}finally{inflight=null;}
 }
 function availability(product){
  const empty={state:'unknown',quantity:0,checkedAt:null,validUntil:0};
  if(!configured()||!snapshot||clock()-snapshot.checkedAt>MAX_AGE)return empty;
  const stamp={checkedAt:snapshot.checkedAt,validUntil:snapshot.checkedAt+MAX_AGE};
  const source=snapshot.products.get(product.supplierSku);
  if(!source)return {...empty,...stamp,state:'unavailable'};
  if(!Number.isSafeInteger(product.supplierMaxUnitPriceMinor)||source.costMinor>product.supplierMaxUnitPriceMinor)return {...empty,...stamp,state:'price_review'};
  const quantity=Math.min(source.quantity,source.maxQuantity,20);
  return {...stamp,state:quantity>0?'available':'out_of_stock',quantity};
 }
 function decorate(products,{privateFields=false}={}){
  void refresh();
  return products.map(product=>{
   const {supplierAvailability:ignored,...raw}=product;
   const visible={...raw};
   if(!privateFields)delete visible.supplierMaxUnitPriceMinor;
   if(product.supplier==='socrate')visible.supplierAvailability=availability(product);
   return visible;
  });
 }
 async function checkOrder(items,products){
  const lines=items.filter(item=>products.find(p=>p.id===item.id)?.supplier==='socrate');
  if(!lines.length)return [];
  await refresh(true);
  return lines.map(item=>{
   const product=products.find(p=>p.id===item.id),stock=availability(product);
   if(stock.state!=='available'||item.quantity>stock.quantity){
    const error=new Error(stock.state==='unknown'?'Не удалось проверить наличие у поставщика. Повторите позже. Счёт не создан.':stock.state==='price_review'?'Закупочная цена изменилась. Уточняем цену товара. Счёт не создан.':'Товара у поставщика уже нет в нужном количестве. Обновите каталог. Счёт не создан.');
    error.status=stock.state==='unknown'?503:409;throw error;
   }
   return {productId:product.id,provider:'socrate',sku:product.supplierSku,quantity:item.quantity,unitPriceMinor:snapshot.products.get(product.supplierSku).costMinor,checkedAt:stock.checkedAt};
  });
 }
 const status=()=>({configured:configured(),state:!configured()?'not_configured':lastError?'unavailable':snapshot?'ready':'checking',checkedAt:snapshot?.checkedAt||null});
 return {refresh,decorate,checkOrder,status};
}
