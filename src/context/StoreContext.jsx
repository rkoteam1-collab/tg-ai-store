import {cartTotals} from '../../shared/cart-totals.js';
import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import {defaultProducts} from '../data/defaultProducts';
import {api} from '../api';
const StoreContext=createContext();
export function StoreProvider({children}) {
 const [products,setProducts]=useState(()=>defaultProducts.map(p=>({...p,inStock:false,stock:0}))),[cart,setCart]=useState(()=>{try{const c=JSON.parse(localStorage.getItem('tg_ai_store_cart'));return Array.isArray(c)?c.filter(i=>typeof i.id==='string'&&Number.isSafeInteger(i.quantity)&&i.quantity>0&&i.quantity<=20):[];}catch{return [];}});
 const revisionRef=useRef(''),refreshSequence=useRef(0);
 const [connection,setConnection]=useState('connecting');
 const [appliedPromo,setAppliedPromo]=useState(null),[channelDiscountApplied,setChannelDiscountApplied]=useState(0);
 const [isAdminOpen,setIsAdminOpen]=useState(false),[isAdminAuthModalOpen,setIsAdminAuthModalOpen]=useState(false),[adminToken,setAdminToken]=useState('');
 const [isCartOpen,setIsCartOpen]=useState(false),[selectedProduct,setSelectedProduct]=useState(null),[toastMessage,setToastMessage]=useState(null);
 const showToast=(text,type='info')=>setToastMessage({text,type,id:Date.now()});
 async function refreshCatalog(silent=false){const seq=++refreshSequence.current;if(!silent)setConnection('connecting');try{const data=await api('/api/catalog',{anonymous:true,timeoutMs:75000});if(!Array.isArray(data.products)||typeof data.revision!=='string')throw new Error();if(seq!==refreshSequence.current)return;setProducts(data.products);revisionRef.current=data.revision;setConnection('ready');}catch{if(seq===refreshSequence.current)setConnection('offline');}}
 useEffect(()=>{refreshCatalog();},[]);
 useEffect(()=>{if(isAdminOpen)return;const update=()=>{if(!document.hidden)refreshCatalog(true);};const timer=setInterval(update,15000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[isAdminOpen]);
 useEffect(()=>{try{localStorage.setItem('tg_ai_store_cart',JSON.stringify(cart.map(({id,quantity})=>({id,quantity}))));}catch{}},[cart]);
 async function verifyAdminPin(pin='') {try{const d=await api('/api/admin/verify',{method:'POST',body:JSON.stringify({pin})});setAdminToken(d.token);return true;}catch(e){showToast(e.message,'error');return false;}}
 function logoutAdmin(){api('/api/admin/logout',{method:'POST',headers:{Authorization:'Bearer '+adminToken},body:'{}'}).catch(()=>{});setAdminToken('');setIsAdminOpen(false);}
 async function persistProducts(updated){try{const saved=await api('/api/products',{method:'POST',headers:{Authorization:'Bearer '+adminToken,'X-Catalog-Revision':revisionRef.current},body:JSON.stringify(updated)});++refreshSequence.current;revisionRef.current=saved.revision;try{const key='aishopify_admin_catalog_backups';const history=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([{savedAt:new Date().toISOString(),products:updated},{savedAt:new Date().toISOString(),products},...(Array.isArray(history)?history:[])].slice(0,10)));}catch{}setProducts(updated);showToast('Изменения сохранены на сервере','success');return true;}catch(e){showToast(e.message,'error');return false;}}
 function addToCart(product){const p=products.find(p=>p.id===product?.id);if(!p?.inStock||p.priceOnRequest||p.stock<=0){showToast('Позиция недоступна','warning');return;}const count=cart.find(i=>i.id===p.id)?.quantity||0;if(count>=Math.min(p.stock,20)){showToast('Достигнут доступный лимит','warning');return;}setCart(prev=>prev.some(i=>i.id===p.id)?prev.map(i=>i.id===p.id?{...i,quantity:i.quantity+1}:i):[...prev,{id:p.id,quantity:1}]);}
 function removeFromCart(id){setCart(prev=>prev.flatMap(i=>i.id===id?(i.quantity>1?[{...i,quantity:i.quantity-1}]:[]):[i]));}
 function removeItemCompletely(id){setCart(prev=>prev.filter(i=>i.id!==id));}
 function clearCart(){setCart([]);setAppliedPromo(null);setChannelDiscountApplied(0);}
 async function applyPromoCode(code){try{const p=await api('/api/promos/validate',{method:'POST',body:JSON.stringify({code})});setAppliedPromo(p);showToast('Промокод применён','success');return true;}catch(e){setAppliedPromo(null);showToast(e.message,'error');return false;}}
 const updateFullProduct=p=>persistProducts(products.map(old=>old.id===p.id?p:old));
 const updateStock=(id,n)=>persistProducts(products.map(p=>p.id===id?{...p,stock:Math.max(0,parseInt(n)||0),inStock:Number(n)>0}:p));
 const toggleInStock=id=>persistProducts(products.map(p=>p.id===id?{...p,inStock:!p.inStock}:p));
 const updatePrice=(id,n,original)=>persistProducts(products.map(p=>p.id===id?{...p,price:Math.max(1,parseInt(n)||1),originalPrice:Math.max(Number(n),Number(original)||Number(n))}:p));
 const updateDiscount=(id,n,active)=>persistProducts(products.map(p=>p.id===id?{...p,discount:Math.min(99,Math.max(0,Number(n)||0)),isDiscountActive:!!active,price:active?Math.round((p.originalPrice||p.price)*(1-Math.min(99,Math.max(0,Number(n)||0))/100)):(p.originalPrice||p.price)}:p));
 const addNewProduct=p=>persistProducts([...products,{...p,id:p.id||'custom-'+Date.now(),stock:Number(p.stock)||0,inStock:Number(p.stock)>0,features:p.features||[]}]);
 const deleteProduct=id=>persistProducts(products.filter(p=>p.id!==id));
 const canCheckout=cart.length>0&&cart.every(i=>{const p=products.find(p=>p.id===i.id);return p&&!p.priceOnRequest&&p.inStock&&p.stock>=i.quantity;});
 const totals=cartTotals(cart.map(i=>({...i,price:products.find(p=>p.id===i.id)?.price||0,minimumPriceRub:products.find(p=>p.id===i.id)?.minimumPriceRub||0})),appliedPromo?.discountPercent||0,channelDiscountApplied);
 const {subtotal:cartSubtotal,promoDiscountAmount,channelDiscountAmount,discountAmount}=totals;
 return <StoreContext.Provider value={{products,canCheckout,restoreProducts:persistProducts,connection,refreshCatalog,cart,cartSubtotal,cartTotal:cartSubtotal-discountAmount,cartItemCount:cart.reduce((s,i)=>s+i.quantity,0),discountAmount,promoDiscountAmount,channelDiscountAmount,channelDiscountApplied,isChannelDiscountClaimed:false,applyChannelDiscount:()=>setChannelDiscountApplied(5),appliedPromo,promoCodes:[],isCartOpen,setIsCartOpen,isAdminOpen,setIsAdminOpen,isAdminAuthModalOpen,setIsAdminAuthModalOpen,isAdminAuthenticated:!!adminToken,adminToken,verifyAdminPin,logoutAdmin,selectedProduct,setSelectedProduct,toastMessage,showToast,addToCart,removeFromCart,removeItemCompletely,clearCart,applyPromoCode,removePromoCode:()=>setAppliedPromo(null),updateFullProduct,updateStock,toggleInStock,updatePrice,updateDiscount,addNewProduct,deleteProduct,resetToDefaults:()=>persistProducts(defaultProducts)}}>{children}</StoreContext.Provider>;
}
export const useStore=()=>useContext(StoreContext);
