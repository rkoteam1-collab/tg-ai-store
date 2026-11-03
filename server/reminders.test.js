import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createReminders,REMINDER_DELAY_MS} from './reminders.js';
import {REMINDER_CONSENT_VERSION,REMINDER_CONSENT_TEXT} from '../shared/reminderConsent.js';
import {createApp} from './app.js';

function fixture({sendError=false}={}){
 let now=Date.parse('2026-11-03T10:00:00Z');const db={orders:[],reminders:[]},sent=[];
 const store={read:key=>structuredClone(db[key]||[]),write:(key,value)=>{db[key]=structuredClone(value);}};
 const telegram={sendMessage:async(...args)=>{sent.push(args);if(sendError)throw new Error('network timeout');}};
 const make=()=>createReminders({store,telegram,clock:()=>now});let service=make();
 return {db,store,sent,get service(){return service;},now:()=>now,advance:ms=>{now+=ms;},restart:()=>{service=make();},optIn:(id=42)=>{service.consent(id,true,REMINDER_CONSENT_VERSION);service.activity(id,'session-1234',false);}};
}
test('Reminder is strictly opt-in, records exact consent, and sends only after two hours',async()=>{
 const f=fixture();f.service.activity(42,'session-1234',true);assert.deepEqual(f.db.reminders,[]);
 assert.throws(()=>f.service.consent(42,true,'old'));
 f.optIn();assert.equal(f.db.reminders[0].consent.text,REMINDER_CONSENT_TEXT);
 f.advance(REMINDER_DELAY_MS-1);await f.service.runDue(null,{force:true});assert.equal(f.sent.length,0);
 f.advance(1);await f.service.runDue(null,{force:true});assert.equal(f.sent.length,1);
 assert.match(f.sent[0][1],/смотрели/);assert.equal(f.sent[0][0],'42');
 assert.ok(f.sent[0][2].reply_markup.inline_keyboard[0][0].web_app.url.startsWith('https://'));
});
test('Cart changes choose the cart text without postponing the visit deadline',async()=>{
 const f=fixture();f.optIn();const due=f.db.reminders[0].dueAt;
 f.advance(60000);f.service.activity(42,'session-1234',true);assert.equal(f.db.reminders[0].dueAt,due);
 f.advance(REMINDER_DELAY_MS);await f.service.runDue(null,{force:true});assert.match(f.sent[0][1],/корзине/);
});
test('Confirmed purchase cancels reminder and another customer purchase does not',async()=>{
 const f=fixture();f.optIn();f.db.orders.push({telegramId:42,status:'paid',paidAt:new Date(f.now()).toISOString()});
 f.advance(REMINDER_DELAY_MS);await f.service.runDue(null,{force:true});assert.equal(f.sent.length,0);assert.equal(f.db.reminders[0].status,'purchased');
 const other=fixture();other.optIn();other.db.orders.push({telegramId:7,status:'paid',paidAt:new Date(other.now()).toISOString()});other.advance(REMINDER_DELAY_MS);await other.service.runDue(null,{force:true});assert.equal(other.sent.length,1);
});
test('Bank reconciliation immediately before delivery suppresses an unreported paid order',async()=>{
 const f=fixture();f.optIn();f.db.orders.push({id:'one',telegramId:42,status:'pending',itpayId:'bank'});f.advance(REMINDER_DELAY_MS);
 await f.service.runDue(async id=>{assert.equal(id,'one');f.db.orders[0]={...f.db.orders[0],status:'paid',paidAt:new Date(f.now()).toISOString()};},{force:true});
 assert.equal(f.sent.length,0);assert.equal(f.db.reminders[0].status,'purchased');
});
test('Uncertain payment or inaccessible bank defers delivery, never assumes non-payment',async()=>{
 for(const order of [{id:'one',telegramId:42,status:'creating'},{id:'one',telegramId:42,status:'pending',itpayId:'bank'}]){
  const f=fixture();f.optIn();f.db.orders.push(order);f.advance(REMINDER_DELAY_MS);
  await f.service.runDue(async()=>{throw new Error('bank unavailable');},{force:true});assert.equal(f.sent.length,0);assert.equal(f.db.reminders[0].status,'pending');
 }
});
test('Opt-out, expiry and opt-out during reconciliation prevent sending',async()=>{
 const f=fixture();f.optIn();f.service.consent(42,false);f.advance(REMINDER_DELAY_MS);await f.service.runDue(null,{force:true});assert.equal(f.sent.length,0);
 const expired=fixture();expired.optIn();expired.advance(91*86400000);await expired.service.runDue(null,{force:true});assert.equal(expired.sent.length,0);assert.deepEqual(expired.db.reminders,[]);
 const racing=fixture();racing.optIn();racing.db.orders.push({id:'one',telegramId:42,status:'pending',itpayId:'bank'});racing.advance(REMINDER_DELAY_MS);
 await racing.service.runDue(async()=>racing.service.consent(42,false),{force:true});assert.equal(racing.sent.length,0);
});
test('Concurrent checks, restart and delivery timeout cannot duplicate a message',async()=>{
 for(const sendError of [false,true]){
  const f=fixture({sendError});f.optIn();f.advance(REMINDER_DELAY_MS);
  await Promise.all([f.service.runDue(null,{force:true}),f.service.runDue(null,{force:true})]);f.restart();await f.service.runDue(null,{force:true});assert.equal(f.sent.length,1);
 }
});
test('Repeated visits cannot spam: at most one attempt per seven days',async()=>{
 const f=fixture();f.optIn();f.advance(REMINDER_DELAY_MS);await f.service.runDue(null,{force:true});
 f.service.activity(42,'another-session',true);f.advance(REMINDER_DELAY_MS);await f.service.runDue(null,{force:true});assert.equal(f.sent.length,1);
 f.advance(7*86400000);f.service.activity(42,'third-session',true);f.advance(REMINDER_DELAY_MS);await f.service.runDue(null,{force:true});assert.equal(f.sent.length,2);
});
test('Renewing expired consent starts a fresh two-hour visit instead of reviving an old due job',async()=>{
 const f=fixture();f.optIn();f.advance(91*86400000);f.service.consent(42,true,REMINDER_CONSENT_VERSION);f.service.activity(42,'session-1234',false);
 await f.service.runDue(null,{force:true});assert.equal(f.sent.length,0);assert.equal(f.db.reminders[0].dueAt,f.now()+REMINDER_DELAY_MS);
});
test('Reminder HTTP routes bind consent/activity to signed Telegram identity',async t=>{
 const f=fixture(),token='test-token-not-real';
 function signed(){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:42})});const data=[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');p.set('hash',createHmac('sha256',createHmac('sha256','WebAppData').update(token).digest()).update(data).digest('hex'));return p.toString();}
 const app=createApp({config:{BOT_TOKEN:token},store:f.store,reminders:f.service});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 async function post(route,body,auth=true){return fetch('http://127.0.0.1:'+server.address().port+route,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Telegram-Init-Data':signed()}: {})},body:JSON.stringify(body)});}
 assert.equal((await post('/api/reminders/consent',{enabled:true,version:REMINDER_CONSENT_VERSION},false)).status,401);
 assert.equal((await post('/api/reminders/consent',{enabled:'true',version:REMINDER_CONSENT_VERSION})).status,400);
 assert.equal((await post('/api/reminders/consent',{enabled:true,version:REMINDER_CONSENT_VERSION,telegramId:7})).status,200);
 assert.equal((await post('/api/reminders/activity',{sessionId:'session-1234',hasCart:true,telegramId:7})).status,200);
 assert.equal(f.db.reminders.length,1);assert.equal(f.db.reminders[0].telegramId,'42');
});
