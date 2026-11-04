// Supplier stock is separate from the owner's manually fulfilled catalog.
export function productAvailability(product,now=Date.now()) {
 if(!product?.supplier)return null;
 const stock=product.supplierAvailability;
 if(!stock||!Number.isFinite(stock.validUntil)||stock.validUntil<=now)return {...stock,state:'unknown',quantity:0};
 return stock;
}
export function canOrderProduct(product,quantity=1,now=Date.now()) {
 if(!product||product.active===false||product.priceOnRequest)return false;
 const stock=productAvailability(product,now);
 return !stock||(stock.state==='available'&&Number.isSafeInteger(quantity)&&quantity>0&&quantity<=stock.quantity);
}
export function availabilityMessage(product,now=Date.now()) {
 const stock=productAvailability(product,now);
 if(!stock)return '';
 if(stock.state==='available')return 'В наличии у поставщика';
 if(stock.state==='out_of_stock')return 'Нет у поставщика';
 if(stock.state==='price_review')return 'Цена уточняется';
 if(stock.state==='unavailable')return 'Временно недоступен';
 return 'Наличие уточняется';
}
