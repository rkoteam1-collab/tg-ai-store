import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './app.js';
import {webhookSecret,TELEGRAM_WEBHOOK_PATH} from './bot-webhook.js';
test('Telegram webhook rejects forged requests and dispatches authenticated updates',async t=>{
 const received=[];const token='test-token-not-real';
 const app=createApp({config:{BOT_TOKEN:token},store:{read:()=>[]},telegramWebhook:(req,res)=>{received.push(req.body);res.json({ok:true});}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port+TELEGRAM_WEBHOOK_PATH;
 for(const secret of ['', 'fake',webhookSecret(token)]){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify({update_id:1})});assert.equal(r.status,secret===webhookSecret(token)?200:403);}
 assert.deepEqual(received,[{update_id:1}]);
});
