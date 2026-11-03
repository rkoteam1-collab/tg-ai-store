import {launchUrl} from './launch.js';

export const PURCHASE_CONFIRMATION_VERSION=1;
export function purchaseConfirmationText(order){
 const clean=value=>String(value||'').replace(/[\r\n\t]+/g,' ').trim();
 const items=Array.isArray(order.items)?order.items:[];
 const lines=[];let length=0;
 for(const item of items){
  const line=`• ${clean(item.name).slice(0,120)||'Услуга'}${item.quantity>1?' × '+item.quantity:''}`;
  if(length+line.length>2000){lines.push(`… и ещё ${items.length-lines.length} позиций.`);break;}
  lines.push(line);length+=line.length+1;
 }
 return `✅ Оплата подтверждена\n\n${lines.join('\n')}\n\nСумма: ${Number(order.amount).toLocaleString('ru-RU')} ₽\nЗаказ: ${clean(order.id).slice(0,100)}\n\nСпасибо за покупку в AIshopify! Заказ принят в работу. Специалист напишет вам в Telegram на аккаунт, с которого оформлен заказ, для подключения услуги. Срок подключения согласуется после оплаты.\n\nЭто сообщение подтверждает оплату и не заменяет кассовый чек.`;
}

export function createPurchaseConfirmations({store,telegram,config={},clock=Date.now}){
 const sending=new Map();let flushing=false;
 const find=id=>store.read('orders').find(o=>o.id===id);
 function update(id,notification){const current=find(id);if(current&&!current.contactRedactedAt)store.saveOrder({...current,buyerConfirmation:notification});}
 function eligible(order){return order?.status==='paid'&&order.buyerConfirmation?.version===PURCHASE_CONFIRMATION_VERSION&&Number.isSafeInteger(Number(order.telegramId))&&Number(order.telegramId)>0&&!order.contactRedactedAt;}
 async function deliver(id){
  if(!telegram||config.BOT_ENABLED==='false')return;
  if(sending.has(id))return sending.get(id);
  const work=(async()=>{
   const order=find(id),job=order?.buyerConfirmation;
   if(!eligible(order)||!['pending','retry'].includes(job.state)||job.nextAttemptAt>clock())return;
   const claim={...job,state:'sending',attempts:(job.attempts||0)+1,attemptedAt:clock()};
   update(id,claim); // Claim is persisted before Telegram I/O; repeated callbacks cannot duplicate it.
   try{
    const message=await telegram.sendMessage(order.telegramId,purchaseConfirmationText(order),{reply_markup:{inline_keyboard:[[{text:'Связаться со специалистом',url:'https://t.me/MaximRkoTeam'}],[{text:'Открыть AIshopify',web_app:{url:launchUrl(config)}}]]}});
    if(!Number.isSafeInteger(message?.message_id)||message.message_id<=0){update(id,{...claim,state:'delivery_unknown'});return;}
    update(id,{...claim,state:'sent',sentAt:clock(),messageId:message.message_id});
   }catch(error){
    const code=error.response?.error_code;
    if(code===429&&claim.attempts<5){
     const retryAfter=Number(error.response?.parameters?.retry_after);
     update(id,{...claim,state:'retry',nextAttemptAt:clock()+Math.max(60,Number.isFinite(retryAfter)?retryAfter:60)*1000});
    }else if(code>=400&&code<500){update(id,{...claim,state:'failed',reason:code===403?'bot_blocked':'telegram_rejected'});}
    else update(id,{...claim,state:'delivery_unknown'}); // A lost response may mean delivery succeeded. Do not resend blindly.
   }
  })();
  sending.set(id,work);try{await work;}finally{sending.delete(id);}
 }
 async function flush(){
  if(flushing||!telegram||config.BOT_ENABLED==='false')return;flushing=true;
  try{
   for(const order of store.read('orders').filter(eligible).slice(0,500)){
    const job=order.buyerConfirmation;
    if(job.state==='sending'&&!sending.has(order.id)&&clock()-job.attemptedAt>5*60*1000)update(order.id,{...job,state:'delivery_unknown'});
   }
   const queued=store.read('orders').filter(o=>eligible(o)&&['pending','retry'].includes(o.buyerConfirmation.state)&&!(o.buyerConfirmation.nextAttemptAt>clock())).slice(0,20);
   for(const order of queued)await deliver(order.id);
  }finally{flushing=false;}
 }
 return {deliver,flush};
}
