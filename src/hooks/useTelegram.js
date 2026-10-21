import {useEffect,useState} from 'react';
import {loadTelegram} from '../telegram';
export function useTelegram(){
 const [tg,setTg]=useState(()=>window.Telegram?.WebApp||null);
 useEffect(()=>{let active=true;loadTelegram().then(value=>{if(active&&value)setTg(value);});const ready=()=>setTg(window.Telegram.WebApp);window.addEventListener('telegram-ready',ready);return()=>{active=false;window.removeEventListener('telegram-ready',ready);};},[]);
 useEffect(()=>{if(tg)try{tg.ready();tg.expand();tg.setHeaderColor?.('#ffffff');tg.setBackgroundColor?.('#ffffff');}catch{}},[tg]);
 const haptic={impact:(style='medium')=>{try{tg?.HapticFeedback?.impactOccurred(style);}catch{}},notification:(type='success')=>{try{tg?.HapticFeedback?.notificationOccurred(type);}catch{}},selection:()=>{try{tg?.HapticFeedback?.selectionChanged();}catch{}}};
 return {tg,user:tg?.initDataUnsafe?.user||{first_name:'Гость'},isTelegram:!!tg?.initData,haptic,colorScheme:tg?.colorScheme||'light',close:()=>tg?.close()};
}
