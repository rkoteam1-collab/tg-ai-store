import React,{useEffect,useRef,useState} from 'react';
import {api} from '../api';
import {getTelegramInitData} from '../telegram';
import {useStore} from '../context/StoreContext';
import {REMINDER_CONSENT_TEXT,REMINDER_CONSENT_VERSION} from '../../shared/reminderConsent.js';

export default function ReminderPreference(){
 const {cartItemCount,isAdminOpen}=useStore();
 const [available,setAvailable]=useState(false),[enabled,setEnabled]=useState(false),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const session=useRef(globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));
 useEffect(()=>{let cancelled=false;async function load(){if(!getTelegramInitData())return;try{const data=await api('/api/reminders');if(!cancelled){setEnabled(data.enabled);setAvailable(true);setLoaded(true);}}catch{}}load();const ready=()=>load();window.addEventListener('telegram-ready',ready);return()=>{cancelled=true;window.removeEventListener('telegram-ready',ready);};},[]);
 useEffect(()=>{if(!loaded||!enabled||isAdminOpen)return;const timer=setTimeout(()=>{api('/api/reminders/activity',{method:'POST',body:JSON.stringify({sessionId:session.current,hasCart:cartItemCount>0})}).then(data=>setEnabled(data.enabled)).catch(()=>{});},500);return()=>clearTimeout(timer);},[loaded,enabled,cartItemCount>0,isAdminOpen]);
 async function change(value){setBusy(true);setError('');try{const data=await api('/api/reminders/consent',{method:'POST',body:JSON.stringify({enabled:value,version:REMINDER_CONSENT_VERSION})});setEnabled(data.enabled);}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!available)return null;
 return <section className="reminder-preference" aria-label="Напоминание в Telegram"><label className="consent"><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>change(e.target.checked)}/><span>Напомнить мне в Telegram примерно через 2 часа, если я не завершу покупку.</span></label><details><summary>Условия и согласие на сообщение</summary><p>{REMINDER_CONSENT_TEXT}</p><a href="?document=privacy" target="_blank" rel="noreferrer">Политика обработки данных</a></details>{error&&<p role="alert" className="form-error">{error}</p>}</section>;
}
