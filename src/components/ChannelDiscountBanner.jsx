import React,{useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {api} from '../api';
export default function ChannelDiscountBanner(){
 const {channelDiscountApplied,applyChannelDiscount,showToast}=useStore();const [busy,setBusy]=useState(false);
 async function check(){setBusy(true);try{const d=await api('/api/check-subscription',{method:'POST',body:'{}'});if(d.success)applyChannelDiscount(5);showToast(d.message,d.success?'success':'info');}catch(e){showToast(e.message,'error');}finally{setBusy(false);}}
 return <div className="channel-strip"><div className="channel-strip-copy"><a href="https://t.me/AIshopifystore" target="_blank" rel="noreferrer">−5% за подписку на канал <ArrowUpRight size={15}/></a><a className="channel-privacy-link" href="?document=privacy" target="_blank" rel="noreferrer">Как обрабатывается Telegram ID</a></div><button onClick={check} disabled={busy||!!channelDiscountApplied}>{channelDiscountApplied?'Подписка подтверждена':busy?'Проверяем…':'Проверить'}</button></div>;
}
