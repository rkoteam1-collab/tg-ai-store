import {createHash} from 'node:crypto';
import {REMINDER_CONSENT_VERSION,REMINDER_CONSENT_TEXT} from '../shared/reminderConsent.js';
import {launchUrl} from './launch.js';

export const REMINDER_DELAY_MS=2*60*60*1000;
const DAY=24*60*60*1000;
export function pruneReminderRecords(store,now=Date.now()){
 const rows=store.read('reminders');
 const kept=rows.filter(r=>{const updated=Number(r.updatedAt||r.consent?.acceptedAt);return Number.isFinite(updated)&&now-updated<90*DAY&&r.consent?.expiresAt>now;});
 if(kept.length!==rows.length)store.write('reminders',kept);
 return kept;
}
export function createReminders({store,telegram,config={},clock=Date.now}) {
 let running=false,lastRun=-Infinity;
 const read=()=>store.read('reminders');
 const find=id=>read().find(r=>r.telegramId===String(id));
 function save(row){const rows=read(),index=rows.findIndex(r=>r.telegramId===row.telegramId);if(index<0)rows.push(row);else rows[index]=row;store.write('reminders',rows);}
 const active=row=>row?.consent?.version===REMINDER_CONSENT_VERSION&&!row.revokedAt&&row.consent.expiresAt>clock();
 function status(id){const row=find(id);return {enabled:active(row),pending:active(row)&&row.status==='pending',consentVersion:REMINDER_CONSENT_VERSION};}
 function consent(id,enabled,version){
  if(!enabled){const row=find(id);if(row)save({...row,revokedAt:clock(),status:'cancelled',updatedAt:clock()});return status(id);}
  if(version!==REMINDER_CONSENT_VERSION)throw new Error('Откройте актуальный текст согласия');
  const rows=read(),old=rows.find(r=>r.telegramId===String(id));
  if(!old&&rows.length>=10000)throw new Error('Напоминания временно недоступны');
  const now=clock(),wasActive=active(old);
  save({...old,telegramId:String(id),sessionId:wasActive?old.sessionId:null,revokedAt:null,status:wasActive&&old.status==='pending'?'pending':'idle',updatedAt:now,consent:{version:REMINDER_CONSENT_VERSION,text:REMINDER_CONSENT_TEXT,textSha256:createHash('sha256').update(REMINDER_CONSENT_TEXT).digest('hex'),acceptedAt:now,expiresAt:now+90*DAY}});
  return status(id);
 }
 function activity(id,sessionId,hasCart){
  const row=find(id);if(!active(row))return status(id);
  const now=clock();
  // A page refresh/cart change never postpones the original reminder.
  if(row.status==='pending')save({...row,hasCart,updatedAt:now});
  else if(row.sessionId!==sessionId&&(!row.lastAttemptAt||now-row.lastAttemptAt>=7*DAY))save({...row,sessionId,openedAt:now,dueAt:now+REMINDER_DELAY_MS,hasCart,status:'pending',updatedAt:now});
  return status(id);
 }
 function purchased(row){return store.read('orders').some(o=>{const paidAt=Date.parse(o.paidAt||o.createdAt);return String(o.telegramId)===row.telegramId&&o.status==='paid'&&(!Number.isFinite(paidAt)||paidAt>=row.openedAt);});}
 async function runDue(reconcile,{force=false}={}){
  const now=clock();if(running||(!force&&now-lastRun<60000)||!telegram||config.BOT_ENABLED==='false')return;
  running=true;lastRun=now;
  try{
   const rows=pruneReminderRecords(store,now);
   for(const candidate of rows.filter(r=>active(r)&&r.status==='pending'&&r.dueAt<=now).slice(0,20)){
    let row=find(candidate.telegramId);if(!active(row)||row.status!=='pending')continue;
    if(purchased(row)){save({...row,status:'purchased',updatedAt:clock()});continue;}
    const unsettled=store.read('orders').filter(o=>String(o.telegramId)===row.telegramId&&['creating','pending','review'].includes(o.status));
    let uncertain=false;
    for(const order of unsettled){
     if(!order.itpayId||!reconcile){uncertain=true;break;}
     try{await reconcile(order.id);}catch{uncertain=true;break;}
    }
    row=find(candidate.telegramId);
    if(!active(row)||row.status!=='pending')continue;
    if(purchased(row)){save({...row,status:'purchased',updatedAt:clock()});continue;}
    if(uncertain)continue; // A missing bank confirmation must never be treated as non-payment.
    const text=row.hasCart?'Вы оставили услуги в корзине AIshopify. Нужна помощь с выбором или оплатой? Напишите @MaximRkoTeam — поможем разобраться.':'Вы недавно смотрели зарубежные сервисы в AIshopify. Подскажите, удалось найти нужную подписку? Если остались вопросы, напишите @MaximRkoTeam.';
    // Persist claim before network I/O: restart/timeout cannot send a duplicate.
    save({...row,status:'claimed',lastAttemptAt:clock(),updatedAt:clock()});
    try{
     await telegram.sendMessage(row.telegramId,text,{reply_markup:{inline_keyboard:[[{text:'Открыть AIshopify',web_app:{url:launchUrl(config)}}],[{text:'Отключить напоминания',callback_data:'reminders_off'}]]}});
     const current=find(row.telegramId);if(current?.status==='claimed')save({...current,status:'sent',sentAt:clock(),updatedAt:clock()});
    }catch(error){
     const current=find(row.telegramId);if(current?.status==='claimed')save({...current,status:'delivery_unknown',updatedAt:clock(),...(error.response?.error_code===403?{revokedAt:clock()}: {})});
    }
   }
  }finally{running=false;}
 }
 return {status,consent,activity,runDue};
}
