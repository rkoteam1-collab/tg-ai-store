import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {BOOTSTRAP_SOURCE,BOOTSTRAP_HASH} from './bootstrap.js';
test('Bootstrap signals Telegram without SDK or React and exposes recovery on startup timeout',()=>{
 const elements={'boot-status':{textContent:''},'boot-recovery':{hidden:true},'boot-retry':{}};
 const events=[],timers=[];const context={document:{getElementById:id=>elements[id]},setTimeout:f=>{timers.push(f);return 1;},clearTimeout:()=>{},setInterval:()=>2,clearInterval:()=>{}};
 context.window={TelegramWebviewProxy:{postEvent:(type,data)=>events.push({type,data})},addEventListener:()=>{}};
 context.window.parent=context.window;
 vm.runInNewContext(BOOTSTRAP_SOURCE,context);
 assert.equal(events[0].type,'web_app_ready');assert.equal(elements['boot-recovery'].hidden,true);
 timers[0]();assert.equal(elements['boot-recovery'].hidden,false);assert.match(elements['boot-status'].textContent,/не загрузилось/);
 assert.equal(BOOTSTRAP_HASH,"'sha256-"+createHash('sha256').update(BOOTSTRAP_SOURCE).digest('base64')+"'");
});
