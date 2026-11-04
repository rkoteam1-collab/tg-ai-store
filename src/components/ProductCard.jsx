import React from 'react';
import {Plus,Minus,ArrowUpRight} from 'lucide-react';
import BrandLogo from './BrandLogo';
import {useStore} from '../context/StoreContext';
import {canOrderProduct,availabilityMessage} from '../../shared/product-availability.js';
export default function ProductCard({product,index=0}) {
 const {cart,addToCart,removeFromCart,setSelectedProduct}=useStore();
 const quantity=cart.find(i=>i.id===product.id)?.quantity||0;
 const available=canOrderProduct(product);
 return <article className="product-card" style={{'--delay':Math.min(index,7)*55+'ms'}}>
   <button className="product-open" onClick={()=>setSelectedProduct(product)} aria-label={'Подробнее: '+product.name}>
     <div className="card-brand"><BrandLogo logo={product.logo} size={28}/><ArrowUpRight className="detail-arrow" size={17}/></div>
     <h3>{product.name}</h3><p className="model-line">{product.model}</p>
     <p className="card-caption">{product.tagline}</p>
     {product.supplier?<span className="supplier-stock">{availabilityMessage(product)}</span>:null}
   </button>
   <div className="card-bottom"><div><strong>{product.priceOnRequest?'Цена по запросу':product.price.toLocaleString('ru-RU')+' ₽'}</strong><small>/ {product.duration}</small></div>
   {!product.priceOnRequest&&product.active!==false ? quantity ? <div className="quantity"><button aria-label={'Убрать '+product.name} onClick={()=>removeFromCart(product.id)}><Minus size={15}/></button><span>{quantity}</span><button disabled={!canOrderProduct(product,quantity+1)||quantity>=20} aria-label={'Добавить '+product.name} onClick={()=>addToCart(product)}><Plus size={15}/></button></div> : <button className="add-button" disabled={!available} aria-label={'В корзину: '+product.name} onClick={()=>addToCart(product)}><Plus size={21}/></button> : <button className="availability" onClick={()=>setSelectedProduct(product)}>Уточнить</button>}
   </div>
 </article>;
}
