import React from 'react';
import {Plus,Minus,ArrowUpRight} from 'lucide-react';
import BrandLogo from './BrandLogo';
import {useStore} from '../context/StoreContext';
export default function ProductCard({product,index=0}) {
 const {cart,addToCart,removeFromCart,setSelectedProduct}=useStore();
 const quantity=cart.find(i=>i.id===product.id)?.quantity||0;
 return <article className="product-card" style={{'--delay':Math.min(index,7)*55+'ms'}}>
   <button className="product-open" onClick={()=>setSelectedProduct(product)} aria-label={'Подробнее: '+product.name}>
     <div className="card-brand"><BrandLogo logo={product.logo} size={42}/><ArrowUpRight className="detail-arrow" size={17}/></div>
     <h3>{product.name}</h3><p className="model-line">{product.model}</p>
     <p className="card-caption">{product.tagline}</p>
   </button>
   <div className="card-bottom"><div><strong>{product.price.toLocaleString('ru-RU')} ₽</strong><small>/ {product.duration}</small></div>
   {product.inStock&&product.stock>0 ? quantity ? <div className="quantity"><button aria-label={'Убрать '+product.name} onClick={()=>removeFromCart(product.id)}><Minus size={15}/></button><span>{quantity}</span><button aria-label={'Добавить '+product.name} onClick={()=>addToCart(product)}><Plus size={15}/></button></div> : <button className="add-button" aria-label={'В корзину: '+product.name} onClick={()=>addToCart(product)}><Plus size={21}/></button> : <button className="availability" onClick={()=>setSelectedProduct(product)}>Уточнить</button>}
   </div>
 </article>;
}
