import test from 'node:test';
import assert from 'node:assert/strict';
import {Telegram} from 'telegraf';
import {launchUrl,backupLaunchUrl,configureMenus,APP_RELEASE,menuRepairMiddleware,startStore} from './launch.js';
test('Telegraf sets global versioned URL and clears personal overrides for known users',async()=>{
 const calls=[];const telegram=new Telegram('test-token-not-real');telegram.callApi=async(method,args)=>{calls.push({method,...args});return true;};
 await configureMenus(telegram,{ADMIN_ID:'8812114263'},[123,456,123,null]);
 assert.equal(calls.length,4);assert.equal(calls[0].method,'setChatMenuButton');
 assert.equal(new URL(calls[0].menu_button.web_app.url).searchParams.get('v'),APP_RELEASE);
 assert.deepEqual(calls.slice(1).map(c=>[c.chat_id,c.menu_button.type]),[[8812114263,'default'],[123,'default'],[456,'default']]);
 assert.equal(launchUrl({FRONTEND_URL:'https://example.com/app?hello=1'}),'https://example.com/app?hello=1&v='+APP_RELEASE);
});
test('Any private user repairs its own override, repeated updates are cached, groups untouched',async()=>{
 const repaired=[];const middleware=menuRepairMiddleware({setChatMenuButton:async args=>repaired.push(args)});let nextCalls=0;
 for(const chat of [{id:111,type:'private'},{id:222,type:'private'},{id:111,type:'private'},{id:-1,type:'group'}])await middleware({chat},()=>{nextCalls++;});
 assert.deepEqual(repaired.map(r=>r.chatId),[111,222]);assert(repaired.every(r=>r.menuButton.type==='default'));assert.equal(nextCalls,4);
});
test('Start replaces old persistent keyboard with current storefront address',async()=>{
 let markup;await startStore({reply:async(text,extra)=>{markup=extra.reply_markup;}});
 assert.equal(markup.is_persistent,true);assert.equal(markup.resize_keyboard,true);
 assert.equal(markup.keyboard[0][0].text,'Открыть AIshopify');assert.equal(markup.keyboard[0][0].web_app.url,launchUrl());assert.equal(markup.keyboard[1][0].text,'Запасной вход');assert.equal(markup.keyboard[1][0].web_app.url,backupLaunchUrl());assert.notEqual(new URL(markup.keyboard[0][0].web_app.url).origin,new URL(markup.keyboard[1][0].web_app.url).origin);assert(!JSON.stringify(markup).includes('cloudflare'));
});

test('Backup entry stays inside Telegram on the alternate host and advertises plain browser diagnostics',async()=>{
 let text,extra;await startStore({reply:async(t,e)=>{text=t;extra=e;}});
 assert(text.includes(launchUrl()));assert(text.includes(backupLaunchUrl()));assert.equal(extra.link_preview_options.is_disabled,true);
 assert(text.includes('отправьте /start ещё раз'));assert(text.includes('«Запасной вход»'));
 assert.equal(backupLaunchUrl({WEBAPP_URL:'https://example.com/'}),'https://example.com/?v='+APP_RELEASE);
});
