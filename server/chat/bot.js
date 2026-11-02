import {Telegraf} from 'telegraf';
import {MAX_MESSAGE_CHARS, PROVIDERS, validCode} from './core.js';
import {generateReply, providerConfigured} from './providers.js';

export const CHAT_WEBHOOK_PATH = '/api/chat/telegram/webhook';
const labels = {openai:'ChatGPT', claude:'Claude', gemini:'Gemini'};
const display = account => `${Number(account.balance).toLocaleString('ru-RU')} токенов`;
const privateChat = ctx => ctx.chat?.type === 'private' && Number.isSafeInteger(ctx.from?.id);

async function sendLong(ctx, value) {
  let text = value;
  while (text.length) {
    const part = text.slice(0, 3800);
    await ctx.reply(part);
    text = text.slice(part.length);
  }
}

export function createChatBot({token,ledger,config,fetchImpl=fetch}) {
  const bot = new Telegraf(token);
  const recent = new Map();
  bot.use(async (ctx,next) => {
    if (config.CHAT_DEMO_MODE !== 'true' || String(ctx.from?.id) === String(config.ADMIN_ID)) return next();
    if (ctx.chat?.type === 'private' && ctx.message?.text?.startsWith('/start')) return ctx.reply('AIshopify Chat готовится к запуску. Покупка пакета пока недоступна.');
    if (ctx.callbackQuery) await ctx.answerCbQuery('Бот пока в тестовом режиме');
  });

  async function redeem(ctx, code) {
    const result = await ledger.redeem(code, ctx.from.id);
    if (result.status === 'redeemed') return ctx.reply(`Код активирован. Баланс: ${result.balance.toLocaleString('ru-RU')} токенов. Напишите сообщение или выберите модель: /model`);
    if (result.status === 'already') return ctx.reply('Этот код уже активирован на вашем аккаунте. Баланс: /balance');
    return ctx.reply('Код не найден или выпущен для другого Telegram-аккаунта. Проверьте символы и аккаунт, с которого купили пакет.');
  }

  bot.start(ctx => privateChat(ctx) && ctx.reply('AIshopify Chat. Один пакет — 1 000 000 общих токенов для ChatGPT, Claude и Gemini. Покупка пакета пока недоступна.\n\nКогда вы получите код, отправьте его сюда одним сообщением. Затем выберите модель командой /model и пишите сообщения.\n\n/balance — остаток\n/last — последний ответ\n/new — новый диалог\n/paysupport — поддержка'));
  bot.command('help', ctx => privateChat(ctx) && ctx.reply('Отправьте код покупки одним сообщением или /redeem КОД. Потом выберите модель: /model. Остаток: /balance. Новый диалог: /new.'));
  bot.command('paysupport', ctx => privateChat(ctx) && ctx.reply('По вопросам оплаты и доступа: @MaximRkoTeam. Укажите номер покупки. Не присылайте пароли и данные карты.'));
  bot.command('balance', async ctx => {
    if (!privateChat(ctx)) return;
    const account = await ledger.account(ctx.from.id);
    await ctx.reply(`Остаток: ${display(account)}. Модель: ${labels[account.provider] || labels.openai}.${account.debt ? '\nЕсть перерасход токенов, обратитесь в поддержку.' : ''}`);
  });
  bot.command('last', async ctx => {
    if (!privateChat(ctx)) return;
    const last = await ledger.lastAnswer(ctx.from.id);
    if (!last) return ctx.reply('Ответов пока нет.');
    await sendLong(ctx,last.answer);
    await ctx.reply(`За этот ответ списано ${Number(last.charged).toLocaleString('ru-RU')} токенов.`);
  });
  bot.command('model', ctx => privateChat(ctx) && ctx.reply('Выберите модель:', {reply_markup:{inline_keyboard:[PROVIDERS.map(provider => ({text:labels[provider],callback_data:`model:${provider}`}))]}}));
  bot.action(/^model:(openai|claude|gemini)$/, async ctx => {
    if (!privateChat(ctx)) return ctx.answerCbQuery();
    const provider = ctx.match[1];
    if (config.CHAT_DEMO_MODE !== 'true' && !providerConfigured(provider, config)) return ctx.answerCbQuery('Модель пока не подключена');
    await ledger.chooseProvider(ctx.from.id, provider);
    await ctx.answerCbQuery(`Выбрана модель ${labels[provider]}`);
    await ctx.reply(`Теперь отвечает ${labels[provider]}. Напишите сообщение.`);
  });
  bot.command('new', async ctx => {
    if (!privateChat(ctx)) return;
    const cleared = await ledger.clearHistory(ctx.from.id);
    await ctx.reply(cleared ? 'Начали новый диалог. Баланс сохранён.' : 'Дождитесь ответа на предыдущий запрос.');
  });
  bot.command('redeem', async ctx => {
    if (!privateChat(ctx)) return;
    const code = ctx.message.text.split(/\s+/)[1];
    await redeem(ctx, code);
  });
  bot.command('demo', async ctx => {
    if (!privateChat(ctx) || config.CHAT_DEMO_MODE !== 'true' || String(ctx.from.id) !== String(config.ADMIN_ID)) return;
    const code = await ledger.createDemoCode(ctx.from.id);
    await ctx.reply(`Тестовый код только для вашего Telegram ID: ${code}`);
  });
  bot.on('text', async ctx => {
    if (!privateChat(ctx)) return;
    const prompt = ctx.message.text.trim();
    if (validCode(prompt)) return redeem(ctx, prompt);
    if (prompt.startsWith('/')) return;
    if (!prompt || prompt.length > MAX_MESSAGE_CHARS) return ctx.reply(`Сообщение должно быть не длиннее ${MAX_MESSAGE_CHARS} символов.`);
    const selected = await ledger.account(ctx.from.id);
    if (config.CHAT_DEMO_MODE !== 'true' && !providerConfigured(selected.provider,config)) return ctx.reply('Модель пока не подключена. Токены не списаны.');
    const now = Date.now();
    if (now - (recent.get(ctx.from.id) || 0) < 1500) return ctx.reply('Подождите секунду перед следующим запросом.');
    recent.set(ctx.from.id, now);
    if (recent.size > 10000) recent.delete(recent.keys().next().value);
    const request = await ledger.reserve({telegramId:ctx.from.id,messageId:ctx.message.message_id,prompt});
    if (request.status === 'duplicate') return;
    if (request.status === 'busy') return ctx.reply('Предыдущий ответ ещё готовится.');
    if (request.status === 'insufficient') return ctx.reply('Недостаточно токенов для следующего запроса. Остаток: /balance');
    if (request.status !== 'reserved') return;
    let answer;
    try {
      await ctx.sendChatAction('typing').catch(() => {});
      answer = await generateReply(request.provider,prompt,request.history,config,fetchImpl);
    } catch (error) {
      const refunded = await ledger.fail(request.id).catch(() => false);
      await ctx.reply(refunded ? 'Не удалось получить ответ. Зарезервированные токены возвращены.' : 'Не удалось получить ответ. Проверьте баланс командой /balance и обратитесь в поддержку, если списание осталось.').catch(() => {});
      console.error('Chat provider request failed',error.message);
      return;
    }
    let settled;
    try {
      settled = await ledger.finish({id:request.id,telegramId:ctx.from.id,prompt,answer:answer.text,usage:answer.usage});
    } catch (error) {
      await ctx.reply('Ответ получен, но учёт токенов пока не подтверждён. Не отправляйте запрос повторно; обратитесь в поддержку.').catch(() => {});
      console.error('Chat settlement failed',error.message);
      return;
    }
    if (settled.status !== 'completed') return;
    try {
      await sendLong(ctx,answer.text);
      await ctx.reply(`Списано: ${settled.charged.toLocaleString('ru-RU')} токенов · Осталось: ${settled.balance.toLocaleString('ru-RU')}`);
    } catch (error) {
      await ctx.reply('Ответ сохранён, токены списаны. Если сообщение не дошло, откройте /last — повторного списания не будет.').catch(() => {});
      console.error('Chat delivery failed',error.message);
    }
  });
  bot.catch(error => console.error('Chat bot update failed',error.message));
  return bot;
}
