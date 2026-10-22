export function cartTotals(lines,promoPercent=0,channelPercent=0){
 const subtotal=lines.reduce((sum,p)=>sum+p.price*p.quantity,0);
 const maximumDiscount=lines.reduce((sum,p)=>sum+Math.max(0,p.price-(p.minimumPriceRub||0))*p.quantity,0);
 const discountBase=lines.reduce((sum,p)=>sum+(p.price>(p.minimumPriceRub||0)?p.price*p.quantity:0),0);
 const promoDiscountAmount=Math.min(Math.round(discountBase*promoPercent/100),maximumDiscount);
 const channelDiscountAmount=Math.min(Math.round(discountBase*channelPercent/100),maximumDiscount-promoDiscountAmount);
 const discountAmount=promoDiscountAmount+channelDiscountAmount;
 return {subtotal,promoDiscountAmount,channelDiscountAmount,discountAmount,amount:subtotal-discountAmount};
}
