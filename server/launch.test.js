import test from 'node:test';
import assert from 'node:assert/strict';
import {launchUrl,configureMenus,APP_RELEASE} from './launch.js';
test('Bot menu uses versioned permanent URL and repairs owner-specific override',async()=>{
 const calls=[];await configureMenus({setChatMenuButton:async args=>calls.push(args)},{ADMIN_ID:'8812114263'});
 assert.equal(calls.length,2);assert.equal(calls[1].chat_id,8812114263);
 for(const call of calls){const url=new URL(call.menu_button.web_app.url);assert.equal(url.hostname,'rkoteam1-collab.github.io');assert.equal(url.searchParams.get('v'),APP_RELEASE);}
 assert.equal(launchUrl({FRONTEND_URL:'https://example.com/app?hello=1'}),'https://example.com/app?hello=1&v='+APP_RELEASE);
});
