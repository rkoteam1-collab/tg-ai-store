import React,{useState} from 'react';
import {Minus,Plus,Trash2} from 'lucide-react';
import Dialog from './Dialog';
import {useStore} from '../context/StoreContext';
export default function CartDrawer({onProceedToCheckout}) {
 const {isCartOpen,setIsCartOpen,cart,products,cartTotal,cartSubtotal,discountAmount,removeItemCompletely,addToCart,removeFromCart,applyPromoCode,appliedPromo,removePromoCode}=useStore();
 const [code,setCode]=useState('');if(!isCartOpen)return null;
 return <Dialog title="Корзина" onClose={()=>setIsCartOpen(false)}>{!cart.length?<div className="empty-state"><h3>Пока пусто</h3><p>Выберите инструмент для своей следующей идеи.</p><button className="primary-button" onClick={()=>setIsCartOpen(false)}>Перейти в каталог</button></div>:<>
 {cart.map(item=>{const p=products.find(p=>p.id===item.id);return <div className="cart-row" key={item.id}><div><h3>{p?.name||'Товар больше недоступен'}</h3><p>{p?.model}</p><div className="quantity"><button aria-label={'Уменьшить '+p?.name} onClick={()=>removeFromCart(item.id)}><Minus size={16}/></button><span>{item.quantity}</span><button disabled={!p} aria-label={'Увеличить '+p?.name} onClick={()=>addToCart(p)}><Plus size={16}/></button></div></div><strong>{((p?.price||0)*item.quantity).toLocaleString('ru-RU')} ₽</strong><button className="icon-button" aria-label={'Удалить '+p?.name} onClick={()=>removeItemCompletely(item.id)}><Trash2 size={18}/></button></div>;})}
 {cart.some(i=>(products.find(p=>p.id===i.id)?.minimumPriceRub||0)>0)&&<p className="muted">Для некоторых товаров скидка ограничена. Итоговая сумма учитывает это ограничение.</p>}
 <form className="promo-form" onSubmit={e=>{e.preventDefault();applyPromoCode(code);}}><input aria-label="Промокод" placeholder="Промокод" value={code} onChange={e=>setCode(e.target.value)}/><button className="outline-button">Применить</button></form>{appliedPromo&&<button className="text-button" onClick={removePromoCode}>Отменить {appliedPromo.code}</button>}
 {discountAmount>0&&<p className="muted">Сумма: {cartSubtotal.toLocaleString('ru-RU')} ₽ · Скидка: {discountAmount.toLocaleString('ru-RU')} ₽</p>}<div className="total-line"><span>Итого</span><strong>{cartTotal.toLocaleString('ru-RU')} ₽</strong></div><button className="primary-button" onClick={onProceedToCheckout}>Перейти к оплате</button></>}</Dialog>;
}
