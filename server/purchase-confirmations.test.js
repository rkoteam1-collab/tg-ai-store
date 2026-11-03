import test from 'node:test';
import assert from 'node:assert/strict';
import {createPurchaseConfirmations,purchaseConfirmationText,PURCHASE_CONFIRMATION_VERSION} from './purchase-confirmations.js';

function fixture(send=async()=>({message_id:123})){
 let now=Date.parse('2026-11-03T12:00:00Z');const calls=[];
 const orders=[{id:'AI-test',telegramId:42,status:'paid',amount:2190,items:[{name:'Claude Pro',quantity:1}],buyerConfirmation:{version:PURCHASE_CONFIRMATION_VERSION,state:'pending',createdAt:now}}];
 const store={read:()=>structuredClone(orders),saveOrder:order=>{orders[orders.findIndex(o=>o.id===order.id)]=structuredClone(order);}};
 const telegram={sendMessage:async(...args)=>{calls.push(args);return send(...args);}};
 const make=config=>createPurchaseConfirmations({store,telegram,config,clock:()=>now});
 return {orders,calls,make,advance:ms=>{now+=ms;},now:()=>now};
}
test('Purchase confirmation names each service/quantity, stays below Telegram text limit and makes no fulfillment claim',()=>{
 const text=purchaseConfirmationText({id:'AI-test',amount:4380,items:[{name:'Claude Pro',quantity:2},{name:'ChatGPT Plus',quantity:1}]});
 assert.match(text,/Claude Pro × 2/);assert.match(text,/ChatGPT Plus/);assert.match(text,/Заказ принят в работу/);assert.match(text,/не заменяет кассовый чек/);
 const long=purchaseConfirmationText({id:'AI-test',amount:99999,items:Array.from({length:30},()=>({name:'A'.repeat(120),quantity:20}))});
 assert(long.length<4096);assert.match(long,/ещё/);
});
test('Only an explicitly queued bank-confirmed paid order can generate a buyer message',async()=>{
 for(const change of [{status:'pending'},{status:'review'},{buyerConfirmation:undefined},{telegramId:null},{contactRedactedAt:'2026-11-03'},{buyerConfirmation:{version:999,state:'pending'}}]){
  const f=fixture();Object.assign(f.orders[0],change);await f.make().deliver('AI-test');assert.equal(f.calls.length,0);
 }
 const disabled=fixture();await disabled.make({BOT_ENABLED:'false'}).flush();assert.equal(disabled.calls.length,0);
});
test('Concurrent callbacks, polling and restart send one purchase confirmation to the stored buyer',async()=>{
 const f=fixture(),service=f.make();
 await Promise.all([service.deliver('AI-test'),service.deliver('AI-test'),service.flush()]);
 await f.make().deliver('AI-test');await f.make().flush();assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],42);
 assert.equal(f.orders[0].buyerConfirmation.state,'sent');assert.equal(f.orders[0].buyerConfirmation.messageId,123);
 assert.equal(f.calls[0][2].reply_markup.inline_keyboard[0][0].url,'https://t.me/MaximRkoTeam');
 assert.equal(f.calls[0][2].parse_mode,undefined);
});
test('Telegram rate limit is retried after its deadline; a successful retry is not duplicated',async()=>{
 let first=true;const f=fixture(async()=>{if(first){first=false;throw {response:{error_code:429,parameters:{retry_after:120}}};}return {message_id:124};});
 const service=f.make();await service.deliver('AI-test');assert.equal(f.orders[0].buyerConfirmation.state,'retry');
 f.advance(119000);await service.flush();assert.equal(f.calls.length,1);
 f.advance(1000);await service.flush();await service.flush();assert.equal(f.calls.length,2);assert.equal(f.orders[0].buyerConfirmation.state,'sent');
});
test('Blocked bot and unknown network delivery do not roll back payment or blindly resend',async()=>{
 for(const error of [{response:{error_code:403}},new Error('network timeout')]){
  const f=fixture(async()=>{throw error;});await f.make().deliver('AI-test');f.advance(600000);await f.make().flush();
  assert.equal(f.calls.length,1);assert.equal(f.orders[0].status,'paid');
  assert.equal(f.orders[0].buyerConfirmation.state,error.response?'failed':'delivery_unknown');
 }
});
test('An interrupted in-flight delivery is marked uncertain on restart and is never duplicated',async()=>{
 const f=fixture();f.orders[0].buyerConfirmation={version:1,state:'sending',attempts:1,attemptedAt:f.now()-600000};
 await f.make().flush();assert.equal(f.calls.length,0);assert.equal(f.orders[0].buyerConfirmation.state,'delivery_unknown');
});
