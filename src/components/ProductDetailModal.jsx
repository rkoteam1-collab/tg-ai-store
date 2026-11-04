import React from 'react';
import Dialog from './Dialog';
import BrandLogo from './BrandLogo';
import {useStore} from '../context/StoreContext';
import {canOrderProduct,availabilityMessage} from '../../shared/product-availability.js';
export default function ProductDetailModal() {
 const {selectedProduct,products,setSelectedProduct,addToCart}=useStore();
 const p=products.find(item=>item.id===selectedProduct?.id);
 if(!p)return null;
 return <Dialog title={p.name} onClose={()=>setSelectedProduct(null)}><div className="detail-logo"><BrandLogo logo={p.logo} size={36}/></div><p className="detail-model">{p.model}</p><p>{p.description}</p><ul className="feature-list">{p.features.map(f=><li key={f}>{f}</li>)}</ul><p><strong>Подключение</strong><br/>{p.delivery}</p><p className="muted"><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceLabel||'Источник производителя'} ↗</a></p><div className="total-line"><strong>{p.priceOnRequest?'Цена по запросу':p.price.toLocaleString('ru-RU')+' ₽'}</strong><span>{p.duration}</span></div>{p.supplier?<p role="status" className="muted">{availabilityMessage(p)}. Наличие перепроверяется перед выставлением счёта. Резерв у поставщика не создаётся; если товар закончится после оплаты, специалист согласует замену или возврат.</p>:null}{!p.priceOnRequest&&p.active!==false?<button className="primary-button" disabled={!canOrderProduct(p)} onClick={()=>{addToCart(p);setSelectedProduct(null);}}>В корзину</button>:<><p className="muted">Точная цена и условия этой позиции согласуются со специалистом.</p><a className="primary-button" href="https://t.me/MaximRkoTeam" target="_blank" rel="noreferrer">Уточнить условия</a></>}</Dialog>;
}
