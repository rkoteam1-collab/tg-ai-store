import React,{useState} from 'react';
import Dialog from './Dialog';
import {useStore} from '../context/StoreContext';
export default function AdminAuthModal({isOpen,onClose}){
 const {verifyAdminPin,setIsAdminOpen}=useStore();const [pin,setPin]=useState(''),[busy,setBusy]=useState(false);
 async function login(value){setBusy(true);try{if(await verifyAdminPin(value)){setPin('');onClose();setIsAdminOpen(true);}}finally{setBusy(false);}}
 if(!isOpen)return null;
 return <Dialog title="Доступ владельца" onClose={onClose}><form className="checkout-form" onSubmit={e=>{e.preventDefault();login(pin);}}><label>Пароль администратора<input type="password" required minLength={4} maxLength={128} autoComplete="current-password" value={pin} onChange={e=>setPin(e.target.value)}/></label><button className="primary-button" disabled={busy}>{busy?'Проверяем…':'Войти'}</button></form><p className="muted">Откройте магазин через Telegram-аккаунт владельца и введите пароль администратора.</p></Dialog>;
}
