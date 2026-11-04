import test from 'node:test';
import assert from 'node:assert/strict';
import {createReminders,REMINDER_DELAY_MS} from './reminders.js';
import {showReminderSettings,enableReminderSettings,REMINDERS_ENABLE_CALLBACK} from './reminder-settings.js';
import {REMINDER_CONSENT_TEXT,REMINDER_CONSENT_VERSION} from '../shared/reminderConsent.js';
function fixture(){
 let now=Date.parse('2026-11-04T10:00:00Z');const db={reminders:[],orders:[]},sent=[],replies=[],acks=[];
 const store={read:key=>structuredClone(db[key]||[]),write:(key,value)=>{db[key]=structuredClone(value);}};
 const reminders=createReminders({store,clock:()=>now,telegram:{sendMessage:async(...args)=>{sent.push(args);}}});
 const ctx={chat:{id:42,type:'private'},from:{id:42},callbackQuery:{data:REMINDERS_ENABLE_CALLBACK,message:{message_id:100}},reply:async(...args)=>{replies.push(args);},answerCbQuery:async text=>{acks.push(text);},editMessageReplyMarkup:async()=>{}};
 return {db,sent,replies,acks,ctx,reminders,advance:ms=>{now+=ms;}};
}
test('Viewing bot notification settings does not subscribe; the exact consent is shown separately',async()=>{
 const f=fixture();await showReminderSettings(f.ctx,f.reminders);
 assert.deepEqual(f.db.reminders,[]);assert.equal(f.replies.length,1);assert(f.replies[0][0].includes(REMINDER_CONSENT_TEXT));assert(f.replies[0][0].includes('выключены'));
 assert.equal(f.replies[0][1].reply_markup.inline_keyboard[0][0].callback_data,REMINDERS_ENABLE_CALLBACK);
 const policy=new URL(f.replies[0][1].reply_markup.inline_keyboard[2][0].url);assert.equal(policy.searchParams.get('document'),'privacy');
});
test('An explicit private bot action records consent and message evidence but waits for a website visit',async()=>{
 const f=fixture();await enableReminderSettings(f.ctx,f.reminders);
 assert.equal(f.db.reminders[0].telegramId,'42');assert.equal(f.db.reminders[0].consent.version,REMINDER_CONSENT_VERSION);assert.equal(f.db.reminders[0].consent.text,REMINDER_CONSENT_TEXT);assert.equal(f.db.reminders[0].consent.messageId,100);assert.equal(f.db.reminders[0].consent.channel,'telegram');
 f.advance(REMINDER_DELAY_MS);await f.reminders.runDue(null,{force:true});assert.equal(f.sent.length,0);
 f.reminders.activity(42,'new-visit-123',false);f.advance(REMINDER_DELAY_MS);await f.reminders.runDue(null,{force:true});assert.equal(f.sent.length,1);
});
test('Group callbacks and old consent buttons cannot enable private reminders',async()=>{
 const group=fixture();group.ctx.chat={id:-1,type:'group'};await showReminderSettings(group.ctx,group.reminders);await enableReminderSettings(group.ctx,group.reminders);assert.equal(group.replies.length,0);assert.equal(group.db.reminders.length,0);
 const stale=fixture();stale.ctx.callbackQuery.data='reminders_on:old-version';await enableReminderSettings(stale.ctx,stale.reminders);assert.equal(stale.db.reminders.length,0);assert.match(stale.acks[0],/notifications/);
});
test('Bank-checked unpaid invoice text takes priority over the cart text and never references another customer',async()=>{
 const f=fixture();await enableReminderSettings(f.ctx,f.reminders);f.reminders.activity(42,'visit-123456',true);
 f.db.orders=[{id:'AI-other',telegramId:7,status:'pending',itpayId:'other-bank'},{id:'AI-own',telegramId:42,status:'pending',itpayId:'own-bank'}];
 f.advance(REMINDER_DELAY_MS);const checked=[];await f.reminders.runDue(async id=>{checked.push(id);},{force:true});
 assert.deepEqual(checked,['AI-own']);assert.equal(f.sent.length,1);assert.match(f.sent[0][1],/неоплаченный счёт/);assert.match(f.sent[0][1],/AI-own/);assert(!f.sent[0][1].includes('AI-other'));assert(!f.sent[0][1].includes('корзине'));
});
