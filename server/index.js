import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Telegraf} from 'telegraf';
import {createApp} from './app.js';
import {createStore} from './storage.js';
const root=path.dirname(fileURLToPath(import.meta.url)), config=process.env;
const store=createStore(path.resolve(config.DATA_DIR||path.join(root,'data')),path.join(root,'data/products.json'));
const bot=config.BOT_TOKEN ? new Telegraf(config.BOT_TOKEN) : null;
const app=createApp({config,store,telegram:bot?.telegram,distPath:path.join(root,'../dist')});
const server=app.listen(Number(config.PORT||3000),'0.0.0.0',()=>console.log(`AI Store listening on ${config.PORT||3000}`));
if (bot && config.BOT_ENABLED!=='false') {
  const url=config.WEBAPP_URL;
  bot.start(ctx=>ctx.reply('AI Store — каталог подписок и технических услуг. Поддержка: @MaximRkoTeam.',url?.startsWith('https://') ? {reply_markup:{inline_keyboard:[[{text:'Открыть магазин',web_app:{url}}]]}} : {}));
  bot.command('myid',ctx=>ctx.reply(String(ctx.from.id)));
  bot.command('paysupport',ctx=>ctx.reply('По вопросам оплаты и возврата: @MaximRkoTeam. Укажите номер заказа. Не отправляйте пароли или данные банковской карты.'));
  bot.catch(()=>console.error('Telegram update failed'));
  bot.launch().catch(()=>console.error('Telegram launch failed; check configuration'));
}
for (const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{
  try {if (bot && config.BOT_ENABLED!=='false') bot.stop(signal);} catch {}
  server.close(()=>process.exit(0));
});
