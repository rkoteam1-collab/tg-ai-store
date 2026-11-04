import {useEffect,useRef,useState} from 'react';
import {api} from '../api';
import {getTelegramInitData} from '../telegram';
import {useStore} from '../context/StoreContext';

// No prompt or checkbox in the storefront. Permission is managed in the bot.
export default function ReminderActivity(){
 const {cartItemCount,isAdminOpen}=useStore();
 const [enabled,setEnabled]=useState(false);
 const hasCart=cartItemCount>0;
 const session=useRef(globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));
 useEffect(()=>{
  let cancelled=false;
  async function load(){if(!getTelegramInitData())return;try{const data=await api('/api/reminders');if(!cancelled)setEnabled(data.enabled===true);}catch{if(!cancelled)setEnabled(false);}}
  const focus=()=>{if(!document.hidden)void load();};
  void load();window.addEventListener('telegram-ready',load);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{cancelled=true;window.removeEventListener('telegram-ready',load);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[]);
 useEffect(()=>{
  if(!enabled||isAdminOpen)return;
  let cancelled=false;
  const timer=setTimeout(()=>{api('/api/reminders/activity',{method:'POST',body:JSON.stringify({sessionId:session.current,hasCart})}).then(data=>{if(!cancelled&&data.enabled!==true)setEnabled(false);}).catch(()=>{});},500);
  return()=>{cancelled=true;clearTimeout(timer);};
 },[enabled,hasCart,isAdminOpen]);
 return null;
}
