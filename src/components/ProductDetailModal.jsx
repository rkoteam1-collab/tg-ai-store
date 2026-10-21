import React from 'react';
import Dialog from './Dialog';
import BrandLogo from './BrandLogo';
import {useStore} from '../context/StoreContext';
export default function ProductDetailModal() {
 const {selectedProduct:p,setSelectedProduct,addToCart}=useStore();
 if(!p)return null;
 return <Dialog title={p.name} onClose={()=>setSelectedProduct(null)}><div className="detail-logo"><BrandLogo logo={p.logo} size={48}/></div><p className="detail-model">{p.model}</p><p>{p.description}</p><ul className="feature-list">{p.features.map(f=><li key={f}>{f}</li>)}</ul><p><strong>Подключение</strong><br/>{p.delivery}</p><p className="muted">Проверено 21.10.2026 · <a href={p.sourceUrl} target="_blank" rel="noreferrer">Источник производителя ↗</a></p><div className="total-line"><strong>{p.price.toLocaleString('ru-RU')} ₽</strong><span>{p.duration}</span></div>{p.inStock&&p.stock>0?<button className="primary-button" onClick={()=>{addToCart(p);setSelectedProduct(null);}}>В корзину</button>:<><p className="muted">Наличие и точные условия тарифа требуют подтверждения. Оплата этой позиции пока недоступна.</p><a className="primary-button" href="https://t.me/MaximRkoTeam" target="_blank" rel="noreferrer">Уточнить условия</a></>}</Dialog>;
}
