import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {createChatLedger} from './chat/ledger.js';
import {PACK_TOKENS,codeForPayment,providerUsage,validCode} from './chat/core.js';
import {generateReply} from './chat/providers.js';
import {createChatBot} from './chat/bot.js';
import {createApp} from './app.js';

async function fixture() {
  const memory = newDb();
  const {Pool} = memory.adapters.createPg();
  const ledger = createChatLedger({pool:new Pool(),codeSecret:'s'.repeat(32)});
  await ledger.migrate();
  return ledger;
}

test('paid voucher is idempotent and redeemable only by its buyer',async()=>{
  const ledger=await fixture();
  const paymentId='AI-123e4567-e89b-12d3-a456-426614174000';
  const code=await ledger.issuePaidVoucher({buyerId:100,paymentId});
  assert.equal(validCode(code),true);
  assert.equal(await ledger.issuePaidVoucher({buyerId:100,paymentId}),code);
  await assert.rejects(ledger.issuePaidVoucher({buyerId:200,paymentId}),/owner mismatch/);
  assert.deepEqual(await ledger.redeem(code,200),{status:'invalid'});
  assert.deepEqual(await ledger.redeem(code,100),{status:'redeemed',credited:PACK_TOKENS,balance:PACK_TOKENS});
  assert.equal((await ledger.redeem(code,100)).status,'already');
  assert.equal((await ledger.account(100)).balance,PACK_TOKENS);
  assert.deepEqual(await ledger.codesForBuyer(100),[{code,redeemed:true}]);
  assert.deepEqual(await ledger.codesForBuyer(200),[]);
  assert.equal(codeForPayment('s'.repeat(32),paymentId),code);
});

test('shared balance charges reported provider usage and returns unused reservation',async()=>{
  const ledger=await fixture();
  await ledger.redeem(await ledger.createDemoCode(100),100);
  const first=await ledger.reserve({telegramId:100,messageId:1,prompt:'Привет'});
  assert.equal(first.status,'reserved');
  assert.equal((await ledger.reserve({telegramId:100,messageId:2,prompt:'Второй'})).status,'busy');
  const settled=await ledger.finish({id:first.id,telegramId:100,prompt:'Привет',answer:'Здравствуйте',usage:42});
  assert.equal(settled.charged,42);
  assert.equal(settled.balance,PACK_TOKENS-42);
  assert.equal((await ledger.reserve({telegramId:100,messageId:1,prompt:'Привет'})).status,'duplicate');
  assert.deepEqual(await ledger.lastAnswer(100),{answer:'Здравствуйте',charged:42});
  await ledger.chooseProvider(100,'claude');
  const second=await ledger.reserve({telegramId:100,messageId:3,prompt:'Hello'});
  assert.equal(second.provider,'claude');
  assert.equal((await ledger.account(100)).balance<PACK_TOKENS-42,true);
  assert.equal(await ledger.fail(second.id),true);
  assert.equal((await ledger.account(100)).balance,PACK_TOKENS-42);
  assert.equal(await ledger.fail(second.id),false);
});

test('large provider usage never creates a negative balance',async()=>{
  const ledger=await fixture();
  await ledger.redeem(await ledger.createDemoCode(100),100);
  const request=await ledger.reserve({telegramId:100,messageId:1,prompt:'Hello'});
  const settled=await ledger.finish({id:request.id,telegramId:100,prompt:'Hello',answer:'World',usage:PACK_TOKENS+10});
  assert.equal(settled.balance,0);
  assert.equal(settled.debt,10);
  assert.equal((await ledger.reserve({telegramId:100,messageId:2,prompt:'Again'})).status,'insufficient');
  const topup=await ledger.redeem(await ledger.createDemoCode(100),100);
  assert.equal(topup.balance,PACK_TOKENS-10);
  assert.equal((await ledger.account(100)).debt,0);
});

test('provider adapters read usage and demo mode makes no network call',async()=>{
  assert.equal(providerUsage('openai',{total_tokens:9}),9);
  assert.equal(providerUsage('claude',{input_tokens:2,output_tokens:3,cache_read_input_tokens:4}),9);
  assert.equal(providerUsage('gemini',{totalTokenCount:9}),9);
  await assert.rejects(async()=>providerUsage('openai',{}),/valid token usage/);
  const response=await generateReply('openai','Hello',[],{CHAT_DEMO_MODE:'true'},()=>{throw new Error('network must not run');});
  assert.match(response.text,/Тестовый ответ/);
  assert.equal(response.usage>0,true);
});

test('demo bot excludes outsiders and owner can redeem and chat with shared balance',async()=>{
  const ledger=await fixture();
  const bot=createChatBot({token:'123:TEST',ledger,config:{CHAT_DEMO_MODE:'true',ADMIN_ID:'100'}});
  bot.botInfo={id:123,is_bot:true,username:'AIshopifyGPT_bot',first_name:'AIshopify GPT'};
  const sent=[];
  bot.context.telegram={
    sendMessage:async(chatId,text,extra)=>{sent.push({method:'sendMessage',payload:{chat_id:chatId,text,...extra}});return {message_id:sent.length,date:0,chat:{id:chatId,type:'private'}};},
    sendChatAction:async()=>true,
  };
  const update=(id,messageId,text)=>({update_id:messageId+id*1000,message:{message_id:messageId,date:0,chat:{id,type:'private'},from:{id,is_bot:false,first_name:'Test'},text,...(text.startsWith('/')?{entities:[{offset:0,length:text.split(' ')[0].length,type:'bot_command'}]}:{})}});
  await bot.handleUpdate(update(200,1,'/start'));
  assert.match(sent.at(-1).payload.text,/готовится к запуску/);
  await bot.handleUpdate(update(200,2,'/demo'));
  await bot.handleUpdate(update(200,3,'Hello'));
  assert.equal((await ledger.account(200)).balance,0);
  assert.equal(sent.length,1);
  await bot.handleUpdate(update(100,1,'/demo'));
  const code=sent.at(-1).payload.text.match(/[A-Za-z0-9]{18}/)?.[0];
  assert.equal(validCode(code),true);
  await bot.handleUpdate(update(100,2,code));
  assert.equal((await ledger.account(100)).balance,PACK_TOKENS);
  await bot.handleUpdate(update(100,3,'Hello'));
  assert.equal((await ledger.account(100)).balance<PACK_TOKENS,true);
  assert.match(sent.at(-1).payload.text,/Списано/);
  const before=(await ledger.account(100)).balance;
  await bot.handleUpdate(update(100,4,'/last'));
  assert.equal((await ledger.account(100)).balance,before);
  assert.match(sent.at(-1).payload.text,/За этот ответ списано/);
});

test('chat pack cannot be bought or activated through public HTTP routes',async t=>{
  const app=createApp({config:{},store:{read:()=>[]}});
  const server=app.listen(0,'127.0.0.1');
  t.after(()=>server.close());
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const offer=await fetch(`${base}/api/chat/offer`).then(r=>r.json());
  assert.deepEqual(offer,{available:false,packTokens:PACK_TOKENS,chatBotUsername:'AIshopifyGPT_bot'});
  assert.equal((await fetch(`${base}/api/chat/telegram/webhook`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(`${base}/api/chat/buy`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,404);
});
