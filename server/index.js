import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Telegraf} from 'telegraf';
import {createApp} from './app.js';
import {createStore} from './storage.js';
import {configureMenus,menuRepairMiddleware,startStore} from './launch.js';
import {webhookSecret,TELEGRAM_WEBHOOK_PATH} from './bot-webhook.js';
import {createChatLedger} from './chat/ledger.js';
import {createChatBot,CHAT_WEBHOOK_PATH} from './chat/bot.js';
import {providerConfigured} from './chat/providers.js';
import {createReminders,pruneReminderRecords} from './reminders.js';
const root=path.dirname(fileURLToPath(import.meta.url)), config=process.env;
const store=createStore(path.resolve(config.DATA_DIR||path.join(root,'data')),path.join(root,'data/products.json'));
function maintainPrivacy(){
  try {store.redactExpiredContacts();pruneReminderRecords(store);} catch(error) {console.error('Order contact retention failed',error.message);}
}
maintainPrivacy();
const privacyTimer=setInterval(maintainPrivacy,24*60*60*1000);
privacyTimer.unref();
let chatLedger=null;
if(config.CHAT_DATABASE_URL&&config.CHAT_CODE_SECRET){
  try{
    chatLedger=createChatLedger({connectionString:config.CHAT_DATABASE_URL,codeSecret:config.CHAT_CODE_SECRET});
    await chatLedger.migrate();
    await chatLedger.recoverStale();
  }catch(error){console.error('Chat database unavailable',error.message);await chatLedger?.close().catch(()=>{});chatLedger=null;}
}
const bot=config.BOT_TOKEN ? new Telegraf(config.BOT_TOKEN) : null;
const telegramWebhook=bot&&config.BOT_ENABLED!=='false'&&config.BOT_TRANSPORT!=='polling'?bot.webhookCallback(TELEGRAM_WEBHOOK_PATH,{secretToken:webhookSecret(config.BOT_TOKEN)}):undefined;
const chatModelsReady=['openai','claude','gemini'].every(provider=>providerConfigured(provider,config));
const chatBot=chatLedger&&config.CHAT_BOT_TOKEN&&(config.CHAT_DEMO_MODE==='true'||chatModelsReady)?createChatBot({token:config.CHAT_BOT_TOKEN,ledger:chatLedger,config}):null;
const chatWebhook=chatBot&&config.CHAT_BOT_TRANSPORT!=='polling'?chatBot.webhookCallback(CHAT_WEBHOOK_PATH,{secretToken:webhookSecret(config.CHAT_BOT_TOKEN)}):undefined;
const reminders=bot&&config.BOT_ENABLED!=='false'?createReminders({config,store,telegram:bot.telegram}):null;
const app=createApp({config,store,telegram:bot?.telegram,distPath:path.join(root,'../dist'),telegramWebhook,chatWebhook,reminders});
const reminderTimer=setInterval(()=>app.locals.runReminders().catch(()=>console.error('Reminder check failed')),60000);
reminderTimer.unref();
const server=app.listen(Number(config.PORT||3000),'0.0.0.0',()=>console.log(`AIshopify listening on ${config.PORT||3000}`));
let shuttingDown=false;
if (bot && config.BOT_ENABLED!=='false') {
  bot.use(menuRepairMiddleware(bot.telegram));
  bot.start(ctx=>startStore(ctx,config));
  bot.command(['shop','help'],ctx=>startStore(ctx,config));
  bot.command('myid',ctx=>ctx.reply(String(ctx.from.id)));
  bot.command('stop_reminders',ctx=>{reminders?.consent(ctx.from.id,false);return ctx.reply('Напоминания AIshopify отключены.');});
  bot.action('reminders_off',async ctx=>{reminders?.consent(ctx.from.id,false);await ctx.answerCbQuery('Напоминания отключены');await ctx.editMessageReplyMarkup({inline_keyboard:[]}).catch(()=>{});});
  bot.command('paysupport',ctx=>ctx.reply('По вопросам оплаты и возврата: @MaximRkoTeam. Укажите номер заказа. Не отправляйте пароли или данные банковской карты.'));
  bot.catch(()=>console.error('Telegram update failed'));
  async function connect(){
    try{
      await configureMenus(bot.telegram,config,store.read('orders').map(o=>o.telegramId));
      if(telegramWebhook){
        const endpoint=new URL(TELEGRAM_WEBHOOK_PATH,config.BACKEND_URL||config.WEBAPP_URL||'https://tg-ai-store.onrender.com').href;
        await bot.telegram.setWebhook(endpoint,{secret_token:webhookSecret(config.BOT_TOKEN),allowed_updates:['message','callback_query'],drop_pending_updates:false});
        console.log('Telegram webhook configured');
      }else{await bot.launch();}
    }catch(error){console.error('Telegram setup failed',error.response?.error_code||'network');if(!shuttingDown)setTimeout(connect,5000).unref();}
  }
  connect();
}
if(chatBot){
  async function connectChat(){
    try{
      if(chatWebhook){
        const endpoint=new URL(CHAT_WEBHOOK_PATH,config.BACKEND_URL||config.WEBAPP_URL||'https://tg-ai-store.onrender.com').href;
        await chatBot.telegram.setWebhook(endpoint,{secret_token:webhookSecret(config.CHAT_BOT_TOKEN),allowed_updates:['message','callback_query'],drop_pending_updates:false});
      }else await chatBot.launch();
      console.log('AIshopify Chat bot configured');
    }catch(error){console.error('AIshopify Chat bot setup failed',error.response?.error_code||'network');if(!shuttingDown)setTimeout(connectChat,5000).unref();}
  }
  connectChat();
}
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{
  shuttingDown=true;
  clearInterval(privacyTimer);
  clearInterval(reminderTimer);
  try {if (bot && config.BOT_ENABLED!=='false') bot.stop(signal);} catch {}
  try {chatBot?.stop(signal);} catch {}
  server.close(async()=>{await chatLedger?.close().catch(()=>{});process.exit(0);});
});
