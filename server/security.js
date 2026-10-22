import {cartTotals} from '../shared/cart-totals.js';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
export const opaqueToken = () => randomBytes(32).toString('hex');
export function equalSecret(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
export function telegramUser(raw,token,now=Date.now()) {
  if (!raw || !token || raw.length>10000) return null;
  try {
    const p=new URLSearchParams(raw);
    if ([...p.keys()].length!==new Set(p.keys()).size) return null;
    const hash=p.get('hash'); p.delete('hash');
    const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
    const secret=createHmac('sha256','WebAppData').update(token).digest();
    const expected=createHmac('sha256',secret).update(data).digest('hex');
    const age=now/1000-Number(p.get('auth_date'));
    if (!equalSecret(hash,expected) || !Number.isFinite(age) || age < -30 || age>3600) return null;
    const u=JSON.parse(p.get('user'));
    return Number.isSafeInteger(u?.id) && u.id>0 ? u : null;
  } catch { return null; }
}
export function validateProducts(v) {
  if (!Array.isArray(v) || v.length>100) return false;
  const ids=new Set();
  return v.every(p=>{
    if (!p || !/^[a-z0-9-]{1,80}$/.test(p.id) || ids.has(p.id)) return false;
    ids.add(p.id);
    return (p.minimumPriceRub===undefined||(Number.isSafeInteger(p.minimumPriceRub)&&p.minimumPriceRub>=0&&p.minimumPriceRub<=p.price)) && typeof p.name==='string' && p.name.length>0 && p.name.length<=120 && Number.isSafeInteger(p.price) && p.price>0 && p.price<=1000000 && Number.isSafeInteger(p.stock) && p.stock>=0 && p.stock<=100000 && typeof p.inStock==='boolean' && Array.isArray(p.features) && p.features.length<=20 && p.features.every(f=>typeof f==='string' && f.length<=500) && (!p.imageUrl || /^https:\/\//.test(p.imageUrl)) && (!p.sourceUrl || /^https:\/\//.test(p.sourceUrl));
  });
}
export const PROMOS=Object.freeze({START:10,AI2026:15,VIPAI:20});
export function validatePromos(promos) {
  if(!Array.isArray(promos)||promos.length>100)return false;
  const codes=new Set();
  return promos.every(p=>{
    if(!p||typeof p.code!=='string'||!/^[A-Z0-9_-]{2,32}$/.test(p.code)||codes.has(p.code))return false;
    codes.add(p.code);
    return Number.isSafeInteger(p.discountPercent)&&p.discountPercent>=1&&p.discountPercent<=90&&typeof p.active==='boolean';
  });
}
export function calculateOrder(items,products,promoCode='',channelPercent=0,promos=Object.entries(PROMOS).map(([code,discountPercent])=>({code,discountPercent,active:true}))) {
  if (!Array.isArray(items) || !items.length || items.length>30) throw new Error('Invalid cart');
  const seen=new Set();
  const lines=items.map(i=>{
    if (!i || seen.has(i.id) || !Number.isSafeInteger(i.quantity) || i.quantity<1 || i.quantity>20) throw new Error('Invalid quantity');
    seen.add(i.id); const p=products.find(p=>p.id===i.id);
    if (!p || !p.inStock || p.stock<i.quantity || p.price<(p.minimumPriceRub||0)) throw new Error('Unavailable');
    return {id:p.id,name:p.name,quantity:i.quantity,price:p.price};
  });
  const code=String(promoCode||'').trim().toUpperCase();
  const promo=promos.find(p=>p.code===code&&p.active);
  if (code && !promo) throw new Error('Invalid promo');
  const totals=cartTotals(lines.map(p=>({...p,minimumPriceRub:products.find(item=>item.id===p.id)?.minimumPriceRub||0})),promo?.discountPercent||0,channelPercent);
  return {items:lines,subtotal:totals.subtotal,amount:totals.amount,promoCode:code||null,channelPercent:totals.channelDiscountAmount>0?channelPercent:0};
}
