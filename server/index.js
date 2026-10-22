import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Telegraf} from 'telegraf';
import {createApp} from './app.js';
import {createStore} from './storage.js';
import {configureMenus,menuRepairMiddleware,startStore} from './launch.js';
import {webhookSecret,TELEGRAM_WEBHOOK_PATH} from './bot-webhook.js';
const root=path.dirname(fileURLToPath(import.meta.url)), config=process.env;
if(config.NODE_ENV==='production'&&config.RENDER!=='true'){
  if(!config.DATA_DIR||!path.isAbsolute(config.DATA_DIR))throw new Error('Production requires an absolute persistent DATA_DIR');
  if(path.resolve(config.DATA_DIR).startsWith(root+path.sep))throw new Error('Production DATA_DIR must be outside the application checkout');
  let backend;
  try{backend=new URL(config.BACKEND_URL);}catch{throw new Error('Production requires an HTTPS BACKEND_URL for the Telegram webhook');}
  if(backend.protocol!=='https:'||backend.hostname.endsWith('.onrender.com'))throw new Error('Production BACKEND_URL must point to the new HTTPS host');
}
const store=createStore(path.resolve(config.DATA_DIR||path.join(root,'data')),path.join(root,'data/products.json'),{ephemeralInventory:config.RENDER==='true'});
const bot=config.BOT_TOKEN ? new Telegraf(config.BOT_TOKEN) : null;
const telegramWebhook=bot&&config.BOT_ENABLED!=='false'&&config.BOT_TRANSPORT!=='polling'?bot.webhookCallback(TELEGRAM_WEBHOOK_PATH,{secretToken:webhookSecret(config.BOT_TOKEN)}):undefined;
const app=createApp({config,store,telegram:bot?.telegram,distPath:path.join(root,'../dist'),telegramWebhook});
const server=app.listen(Number(config.PORT||3000),'0.0.0.0',()=>console.log(`AIshopify listening on ${config.PORT||3000}`));
let shuttingDown=false;
if (bot && config.BOT_ENABLED!=='false') {
  bot.use(menuRepairMiddleware(bot.telegram));
  bot.start(ctx=>startStore(ctx,config));
  bot.command(['shop','help'],ctx=>startStore(ctx,config));
  bot.command('myid',ctx=>ctx.reply(String(ctx.from.id)));
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
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{
  shuttingDown=true;
  try {if (bot && config.BOT_ENABLED!=='false') bot.stop(signal);} catch {}
  server.close(()=>process.exit(0));
});
