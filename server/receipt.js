// Tax settings must be copied from the merchant's registered cash register.
// No assumptions about VAT, tax regime, or settlement method are made here.
export function buildReceipt(order, config) {
  const names=['ITPAY_TAXATION_SYSTEM','ITPAY_VAT','ITPAY_RECEIPT_TYPE','ITPAY_RECEIPT_OBJECT'];
  if (names.some(n=>config[n]===undefined || config[n]==='')) return undefined;
  const [taxation_system,vat,type,object]=names.map(n=>Number(config[n]));
  if (![0,1,2,4,5].includes(taxation_system) || ![2,4,5,6,7,8,9,10,11,12].includes(vat) || ![1,2,3,4,5,6,7].includes(type) || ![1,3,4,9,11,13].includes(object)) throw new Error('Invalid fiscal configuration');
  // Allocate the final sum in kopecks over individual units to avoid rounding loss.
  const units=order.items.flatMap(i=>Array.from({length:i.quantity},()=>({name:i.name,weight:i.price})));
  let allocated=0;
  const items=units.map((u,index)=>{
    const cents=index===units.length-1 ? order.amount*100-allocated : Math.floor(order.amount*100*u.weight/order.subtotal);
    allocated+=cents;
    return {label:u.name.slice(0,128),quantity:'1',price:(cents/100).toFixed(2),vat,type,object};
  });
  return {customer_email:order.email,taxation_system,items};
}
