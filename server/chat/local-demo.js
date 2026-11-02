import {randomBytes} from 'node:crypto';
import {newDb} from 'pg-mem';
import {createChatLedger} from './ledger.js';
import {createChatBot} from './bot.js';

const token=process.env.CHAT_BOT_TOKEN;
const adminId=process.env.ADMIN_ID;
if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error('CHAT_BOT_TOKEN is required');
if (!adminId || !/^\d+$/.test(adminId)) throw new Error('ADMIN_ID is required');

// Owner-only preview. All demo credits and chats disappear when this process stops.
const memory=newDb();
const {Pool}=memory.adapters.createPg();
const ledger=createChatLedger({pool:new Pool(),codeSecret:randomBytes(32).toString('hex')});
await ledger.migrate();
const bot=createChatBot({token,ledger,config:{CHAT_DEMO_MODE:'true',ADMIN_ID:adminId}});
const info=await bot.telegram.getMe();
if (info.username?.toLowerCase()!=='aishopifygpt_bot') throw new Error('Token belongs to another bot');
const hook=await bot.telegram.getWebhookInfo();
if (hook.url) throw new Error('Webhook is configured; polling would conflict');
bot.botInfo=info;
await bot.telegram.deleteWebhook({drop_pending_updates:false});
console.log(`Local owner-only demo ready: @${info.username}`);
await bot.startPolling(['message','callback_query']);
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>bot.stop(signal));
