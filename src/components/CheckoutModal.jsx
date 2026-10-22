import React,{useState,useEffect,useRef} from 'react';
import {CheckCircle,ExternalLink,RefreshCw} from 'lucide-react';
import Dialog from './Dialog';
import {useStore} from '../context/StoreContext';
import {api} from '../api';
export default function CheckoutModal({isOpen,onClose,onOpenLegal}) {
 const {cart,canCheckout,cartTotal,appliedPromo,channelDiscountApplied,clearCart}=useStore();
 const [email,setEmail]=useState(''),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[paid,setPaid]=useState(false);
 const [invoice,setInvoice]=useState(()=>{try{return JSON.parse(sessionStorage.getItem('ai_pending_invoice'))||null;}catch{return null;}});
 const clearRef=useRef(clearCart);clearRef.current=clearCart;
 async function check(){if(!invoice)return;try{const d=await api('/api/payments/status/'+invoice.orderId,{headers:{'X-Order-Token':invoice.accessToken}});setError('');if(d.status==='paid'){setPaid(true);sessionStorage.removeItem('ai_pending_invoice');clearRef.current();}else if(['failed','expired','canceled','cancelled','rejected','error'].includes(d.status)){setError('Счёт закрыт. Можно оформить новый заказ.');setInvoice(null);sessionStorage.removeItem('ai_pending_invoice');}}catch(e){setError(e.message);}}
 useEffect(()=>{
  if(!isOpen||!invoice||paid)return;
  let stopped=false,timer;
  async function poll(){await check();if(!stopped)timer=setTimeout(poll,5000);}
  poll();return()=>{stopped=true;clearTimeout(timer);};
 },[isOpen,invoice,paid]);
 async function submit(e){e.preventDefault();if(busy||invoice||!canCheckout)return;setBusy(true);setError('');try{
  const d=await api('/api/payments/create',{method:'POST',body:JSON.stringify({email,acceptOffer:accepted,items:cart.map(({id,quantity})=>({id,quantity})),expectedAmount:cartTotal,promoCode:appliedPromo?.code,channelDiscount:!!channelDiscountApplied})});
  setInvoice(d);sessionStorage.setItem('ai_pending_invoice',JSON.stringify(d));
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!isOpen)return null;
 return <Dialog title={paid?'Оплата получена':'Оплата через СБП'} onClose={onClose}>{paid?<div className="success-state"><CheckCircle size={48}/><h3>Спасибо за заказ.</h3><p>Платёж подтверждён. После оплаты с вами свяжется специалист в Telegram на аккаунте, с которого вы приобрели товар. Срок подключения согласуется после оплаты.</p><p className="order-id">{invoice?.orderId}</p><p>Подтверждение на экране не заменяет кассовый чек.</p><a href="https://t.me/MaximRkoTeam" target="_blank" rel="noreferrer">Связаться с поддержкой ↗</a><button className="primary-button" onClick={()=>{setInvoice(null);setPaid(false);setEmail('');setAccepted(false);onClose();}}>Вернуться в каталог</button></div>:invoice?<>
 <p>Счёт создан. Проверьте сумму в приложении банка.</p><p className="order-id">{invoice.orderId}</p>{typeof invoice.qrImage==='string'&&invoice.qrImage.startsWith('https://')&&<img className="qr-image" src={invoice.qrImage} alt="QR-код для оплаты через СБП"/>}<div className="total-line"><span>К оплате</span><strong>{invoice.amount.toLocaleString('ru-RU')} ₽</strong></div><a className="primary-button" href={invoice.qrUrl} target="_blank" rel="noreferrer">Открыть оплату <ExternalLink size={17}/></a><p className="muted">Статус обновляется автоматически. Закрытие окна не отменяет счёт.</p><button className="outline-button" onClick={check}><RefreshCw size={16}/> Проверить оплату</button>
 </>:<form className="checkout-form" onSubmit={submit}><p>Альфа-Банк / IT-Pay · точная сумма заказа</p><label>Email для заказа и чека<input type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><p className="muted">Покупка производится через специалиста. После оплаты с вами свяжутся в Telegram на аккаунте, с которого вы приобрели товар. Срок подключения согласуется после оплаты.</p><div className="total-line"><span>К оплате</span><strong>{cartTotal.toLocaleString('ru-RU')} ₽</strong></div><label className="consent"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>Принимаю <button type="button" className="text-button" onClick={()=>onOpenLegal('offer')}>условия заказа</button>. Понимаю, что покупку выполняет специалист; связь и согласование срока — после оплаты.</span></label><p className="muted">Данные для исполнения заказа обрабатываются по <button type="button" className="text-button" onClick={()=>onOpenLegal('privacy')}>политике конфиденциальности</button>. Согласие на рекламу не запрашивается.</p><button className="primary-button" disabled={busy||!canCheckout||!accepted}>{busy?'Создаём счёт…':'Оплатить через СБП'}</button></form>}{error&&<p role="alert" className="form-error">{error}</p>}</Dialog>;
}
