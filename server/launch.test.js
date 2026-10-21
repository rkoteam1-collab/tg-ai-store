import test from 'node:test';
import assert from 'node:assert/strict';
import {Telegram} from 'telegraf';
import {launchUrl,configureMenus,APP_RELEASE} from './launch.js';
test('Telegraf serializes versioned bot menu and owner override into correct Bot API fields',async()=>{
 const calls=[];const telegram=new Telegram('test-token-not-real');telegram.callApi=async(method,args)=>{calls.push({method,...args});return true;};
 await configureMenus(telegram,{ADMIN_ID:'8812114263'});
 assert.equal(calls.length,2);assert.equal(calls[1].chat_id,8812114263);assert.equal(calls[0].method,'setChatMenuButton');
 for(const call of calls){const url=new URL(call.menu_button.web_app.url);assert.equal(url.hostname,'rkoteam1-collab.github.io');assert.equal(url.searchParams.get('v'),APP_RELEASE);}
 assert.equal(launchUrl({FRONTEND_URL:'https://example.com/app?hello=1'}),'https://example.com/app?hello=1&v='+APP_RELEASE);
});
