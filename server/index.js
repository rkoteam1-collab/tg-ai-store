import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import { spawn } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const DISCOUNTS_FILE = path.join(__dirname, 'data', 'channel_discounts.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Enable Gzip/Deflate compression for blazing fast loading
app.use(compression());
app.use(cors());
app.use(express.json());

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getProducts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading products file:', err);
  }
  return [];
}

function saveProducts(products) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing products file:', err);
    return false;
  }
}

function getClaimedDiscounts() {
  try {
    if (fs.existsSync(DISCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(DISCOUNTS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveClaimedDiscount(userId) {
  try {
    const list = getClaimedDiscounts();
    const strId = String(userId);
    if (!list.includes(strId)) {
      list.push(strId);
      fs.writeFileSync(DISCOUNTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
    return true;
  } catch (e) {
    console.error('Error saving discount:', e);
    return false;
  }
}

function getOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading orders file:', err);
  }
  return [];
}

function saveOrder(order) {
  try {
    const orders = getOrders();
    const existingIdx = orders.findIndex(o => o.id === order.id);
    if (existingIdx >= 0) {
      orders[existingIdx] = { ...orders[existingIdx], ...order };
    } else {
      orders.unshift(order);
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving order:', err);
    return false;
  }
}

// REST API
app.get('/api/products', (req, res) => {
  res.json(getProducts());
});

app.post('/api/products', (req, res) => {
  const updatedProducts = req.body;
  if (!Array.isArray(updatedProducts)) {
    return res.status(400).json({ error: 'Expected an array of products' });
  }
  const ok = saveProducts(updatedProducts);
  if (ok) {
    res.json({ success: true, count: updatedProducts.length });
  } else {
    res.status(500).json({ error: 'Failed to write products data' });
  }
});

// Admin auth endpoint
app.post('/api/admin/verify', (req, res) => {
  const { pin } = req.body;
  const correctPin = process.env.ADMIN_PIN || '7788';
  if (pin && String(pin).trim() === String(correctPin).trim()) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Неверный PIN-код' });
});

// Auth config endpoint
app.get('/api/admin/config', (req, res) => {
  res.json({
    adminId: process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : null
  });
});

// Check if user already claimed the 5% subscription discount
app.get('/api/subscription-status/:userId', (req, res) => {
  const { userId } = req.params;
  const claimedList = getClaimedDiscounts();
  const hasClaimed = claimedList.includes(String(userId));
  res.json({ hasClaimed });
});

// Check channel subscription endpoint
app.post('/api/check-subscription', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'Для проверки подписки откройте магазин через Telegram-бота'
    });
  }

  const strId = String(userId);
  const claimedList = getClaimedDiscounts();

  // Check if discount already used on this account
  if (claimedList.includes(strId)) {
    return res.json({
      success: false,
      alreadyClaimed: true,
      message: 'Вы уже использовали разовую скидку 5% на этом аккаунте'
    });
  }

  // Check subscription via bot in @AIshopifystore
  if (globalTelegramBot) {
    try {
      const member = await globalTelegramBot.telegram.getChatMember('@AIshopifystore', userId);
      const isSubscribed = ['creator', 'administrator', 'member', 'restricted'].includes(member.status);

      if (isSubscribed) {
        saveClaimedDiscount(userId);
        return res.json({
          success: true,
          discountPercent: 5,
          message: 'Подписка на @AIshopifystore подтверждена! Скидка 5% активирована.'
        });
      } else {
        return res.json({
          success: false,
          notSubscribed: true,
          channelUrl: 'https://t.me/AIshopifystore',
          message: 'Вы еще не подписались на канал @AIshopifystore. Подпишитесь и нажмите проверить!'
        });
      }
    } catch (err) {
      console.warn('Telegram channel check warning:', err.message);
      // If bot is not yet added to channel, inform owner
      return res.json({
        success: false,
        notSubscribed: true,
        channelUrl: 'https://t.me/AIshopifystore',
        message: 'Не удалось проверить подписку. Убедитесь, что бот @AIshopify1_bot добавлен в администраторы канала @AIshopifystore!'
      });
    }
  }

  return res.status(500).json({ success: false, message: 'Бот не инициализирован' });
});

// Create Dynamic SBP Payment via IT-Pay (Alfa-Bank)
app.post('/api/payments/create', async (req, res) => {
  const { amount, email, items, telegramId, username } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Неверная сумма заказа' });
  }

  const orderId = `AI-${Math.floor(100000 + Math.random() * 900000)}`;
  const key = process.env.ALFA_SBP_KEY;
  const id = process.env.ALFA_SBP_ID;

  if (!key || !id) {
    return res.status(500).json({ success: false, message: 'Платежный шлюз Альфа СБП не настроен' });
  }

  try {
    const auth = Buffer.from(`${id}:${key}`).toString('base64');
    const response = await fetch('https://api.gw.itpay.ru/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(amount).toFixed(2),
        client_payment_id: orderId,
        method: 'sbp',
        description: `Оплата заказа ${orderId} в AIshopify`,
        metadata: {
          email: email || '',
          telegram_id: telegramId ? String(telegramId) : '',
          username: username || '',
          order_id: orderId
        }
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('IT-Pay create payment error:', data);
      return res.status(400).json({
        success: false,
        message: data.error || 'Ошибка при создании счета в Альфа СБП'
      });
    }

    const paymentData = data.data;
    const qrUrl = paymentData.payment_qr_urls?.desktop || paymentData.payment_qr_urls?.android || paymentData.payment_qr_urls?.ios;
    const qrImage = paymentData.payment_qr_images?.desktop || paymentData.payment_qr_images?.android;

    const newOrder = {
      id: orderId,
      itpayId: paymentData.id,
      amount: Number(amount),
      email: email || '',
      telegramId: telegramId || null,
      username: username || null,
      items: items || [],
      status: 'pending',
      qrUrl,
      qrImage,
      createdAt: new Date().toISOString()
    };
    saveOrder(newOrder);

    // Notify Admin in Telegram that a payment link has been generated
    const ADMIN_ID = process.env.ADMIN_ID;
    if (globalTelegramBot && ADMIN_ID) {
      try {
        globalTelegramBot.telegram.sendMessage(
          ADMIN_ID,
          `🛒 <b>Новый заказ СБП</b>\n\n` +
          `📦 Заказ: <code>${orderId}</code>\n` +
          `💰 Сумма: <b>${amount} ₽</b>\n` +
          `📧 Email: <code>${email || 'не указан'}</code>\n` +
          `👤 Клиент: ${username ? `@${username}` : (telegramId || 'Покупатель')}\n` +
          `⏳ Ожидание оплаты покупателем...`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      } catch (e) {}
    }

    res.json({
      success: true,
      orderId,
      itpayId: paymentData.id,
      amount: Number(amount),
      qrUrl,
      qrImage
    });
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ success: false, message: 'Ошибка связи с платежным сервисом' });
  }
});

// Check payment status (for frontend auto-poll)
app.get('/api/payments/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Заказ не найден' });
  }

  if (order.status === 'paid') {
    return res.json({ success: true, status: 'paid', order });
  }

  // If pending and has itpayId, poll IT-Pay API directly
  if (order.itpayId) {
    try {
      const key = process.env.ALFA_SBP_KEY;
      const id = process.env.ALFA_SBP_ID;
      const auth = Buffer.from(`${id}:${key}`).toString('base64');
      const r = await fetch(`https://api.gw.itpay.ru/v1/payments/${order.itpayId}`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const data = await r.json();
      if (data?.data?.status === 'paid' || data?.data?.status === 'completed') {
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        saveOrder(order);
        notifyOrderSuccess(order);
      }
    } catch (e) {
      console.warn('Error polling IT-Pay status:', e.message);
    }
  }

  res.json({ success: true, status: order.status, order });
});

// Alfa-Bank SBP Webhook handler
app.post('/api/payments/alfa/webhook', async (req, res) => {
  console.log('💳 Alfa-Bank SBP Webhook received:', JSON.stringify(req.body));
  const body = req.body || {};
  const event = body.event;
  const payment = body.data || body.payment || body;

  const paymentId = payment.id;
  const clientPaymentId = payment.client_payment_id;
  const status = payment.status;

  const isSuccess = event === 'payment.pay' || event === 'payment.completed' || status === 'paid' || status === 'completed';

  if (isSuccess && (clientPaymentId || paymentId)) {
    const orders = getOrders();
    const order = orders.find(o => o.id === clientPaymentId || o.itpayId === paymentId);
    if (order && order.status !== 'paid') {
      order.status = 'paid';
      order.paidAt = new Date().toISOString();
      order.payerPhone = payment.payer || null;
      saveOrder(order);
      notifyOrderSuccess(order);
    }
  }

  res.status(200).json({ status: 'ok' });
});

app.get('/api/payments/alfa/webhook', (req, res) => {
  res.status(200).send('Alfa-Bank Webhook Endpoint Active');
});

function notifyOrderSuccess(order) {
  const ADMIN_ID = process.env.ADMIN_ID;
  if (globalTelegramBot) {
    if (ADMIN_ID) {
      globalTelegramBot.telegram.sendMessage(
        ADMIN_ID,
        `🎉 <b>ДЕНЬГИ ПОЛУЧЕНЫ! (СБП Альфа)</b>\n\n` +
        `📦 Заказ: <code>${order.id}</code>\n` +
        `💰 Сумма: <b>${order.amount} ₽</b>\n` +
        `📧 Email: <code>${order.email}</code>\n` +
        `📱 Телефон плательщика: ${order.payerPhone || 'СБП'}\n\n` +
        `✅ Заказ отмечен как ОПЛАЧЕН! Выдайте доступ покупателю.`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✉️ Написать покупателю',
                  url: order.username ? `https://t.me/${order.username}` : `tg://user?id=${order.telegramId || ADMIN_ID}`
                }
              ]
            ]
          }
        }
      ).catch(e => console.warn('Admin tg notify err:', e.message));
    }

    if (order.telegramId) {
      globalTelegramBot.telegram.sendMessage(
        order.telegramId,
        `✅ <b>Оплата заказа ${order.id} успешно получена!</b>\n\n` +
        `Сумма: <b>${order.amount} ₽</b>\n` +
        `Данные доступа и инструкции отправляются на <b>${order.email}</b>.\n\n` +
        `Спасибо за покупку в AI Store! 🚀`,
        { parse_mode: 'HTML' }
      ).catch(e => console.warn('Customer tg notify err:', e.message));
    }
  }
}

// Serve frontend build with aggressive cache for static assets (for 0ms reloads)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.includes('assets')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start HTTP Server
app.listen(PORT, async () => {
  console.log(`\n🚀 AI Store Server is running at http://localhost:${PORT}`);
  console.log(`📦 API available at http://localhost:${PORT}/api/products`);

  await initTelegramBot();
});

let globalTelegramBot = null;

// Start Cloudflare Tunnel
function startCloudflareTunnel(port) {
  return new Promise((resolve) => {
    const binPath = path.join(__dirname, '..', 'node_modules', 'cloudflared', 'bin', 'cloudflared.exe');
    if (!fs.existsSync(binPath)) {
      console.warn('cloudflared.exe not found at:', binPath);
      return resolve({ url: null, child: null });
    }

    console.log('🔄 Starting Cloudflare Tunnel with HTTP2 protocol...');
    const child = spawn(binPath, ['tunnel', '--protocol', 'http2', '--url', `http://localhost:${port}`]);
    let resolved = false;

    child.stderr.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !resolved) {
        resolved = true;
        resolve({ url: match[0], child });
      }
    });

    child.on('error', (err) => {
      console.warn('Cloudflare tunnel error:', err);
      if (!resolved) resolve({ url: null, child: null });
    });

    setTimeout(() => {
      if (!resolved) {
        console.warn('Cloudflare tunnel timeout');
        resolve({ url: null, child });
      }
    }, 15000);
  });
}

// Telegram Bot Integration
async function initTelegramBot() {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  let webAppUrl = process.env.WEBAPP_URL || `http://localhost:${PORT}`;

  if (!webAppUrl.startsWith('https://')) {
    const { url, child } = await startCloudflareTunnel(PORT);
    if (url) {
      webAppUrl = url;
      console.log(`✅ Cloudflare Public HTTPS WebApp URL: ${webAppUrl}`);
      if (child) {
        process.once('SIGINT', () => child.kill());
        process.once('SIGTERM', () => child.kill());
      }
    }
  }

  if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    try {
      const bot = new Telegraf(BOT_TOKEN);
      globalTelegramBot = bot;

      // Command /start
      bot.command('start', async (ctx) => {
        try {
          const username = ctx.from?.first_name || 'друг';
          const isHttps = webAppUrl.startsWith('https://');

          if (isHttps) {
            // Guarantee menu button for this chat
            await ctx.setChatMenuButton({
              type: 'web_app',
              text: '🛍️ Магазин',
              web_app: { url: webAppUrl }
            }).catch(() => {});

            await ctx.reply(
              `👋 Привет, ${username}!\n\n` +
              `Добро пожаловать в магазин нейросетей.\n` +
              `У нас доступны подписки Claude, ChatGPT, Gemini и Kimi.\n\n` +
              `🎁 Подпишитесь на наш канал https://t.me/AIshopifystore и получите скидку 5% на заказ!\n\n` +
              `Нажмите кнопку ниже, чтобы открыть магазин:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '⚡ Открыть AI Store',
                        web_app: { url: webAppUrl }
                      }
                    ]
                  ]
                }
              }
            );

            // Also provide persistent bottom keyboard button
            await ctx.reply(
              `📱 Кнопка магазина также закреплена внизу экрана:`,
              {
                reply_markup: {
                  keyboard: [
                    [
                      {
                        text: '🛍️ Открыть AI Store',
                        web_app: { url: webAppUrl }
                      }
                    ]
                  ],
                  resize_keyboard: true,
                  is_persistent: true
                }
              }
            );
          } else {
            await ctx.reply(`Магазин запущен: ${webAppUrl}`);
          }
        } catch (err) {
          console.error('Error in /start handler:', err);
        }
      });

      // Command /myid
      bot.command('myid', async (ctx) => {
        try {
          const userId = ctx.from?.id;
          await ctx.reply(
            `🆔 Ваш Telegram ID: <code>${userId}</code>`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error(e);
        }
      });

      // Command /admin
      bot.command('admin', async (ctx) => {
        try {
          const userId = String(ctx.from?.id);
          const configuredAdminId = process.env.ADMIN_ID ? String(process.env.ADMIN_ID).trim() : null;

          if (userId === configuredAdminId || !configuredAdminId) {
            await ctx.reply(
              `👑 Здравствуйте, Администратор!\n\n` +
              `Вам доступно управление товарами, ценами, скидками и остатками.\n` +
              `Откройте магазин кнопкой внизу или по /start — в правом верхнем углу будет кнопка «Управление».`
            );
          } else {
            await ctx.reply(`⛔ Доступ запрещен.`);
          }
        } catch (e) {
          console.error(e);
        }
      });

      // Listen to WebApp data from checkout
      bot.on('message', async (ctx) => {
        if (ctx.message?.web_app_data) {
          try {
            const data = JSON.parse(ctx.message.web_app_data.data);
            console.log('Received WebApp Order Data:', data);
            await ctx.reply(
              `✅ Заказ #${data.orderId} успешно принят!\n\n` +
              `Сумма: ${data.total} ₽\n` +
              `Email: ${data.email}\n` +
              `Товары:\n${data.items.join('\n')}\n\n` +
              `Спасибо за покупку!`
            );
          } catch (e) {
            console.error('Failed to parse web_app_data', e);
          }
        }
      });

      bot.catch((err, ctx) => {
        console.error(`Telegram Bot Error for ${ctx.updateType}:`, err);
      });

      bot.launch();
      console.log('🤖 Telegram Bot (@AIshopify1_bot) started successfully!');

      if (webAppUrl.startsWith('https://')) {
        try {
          await bot.telegram.setChatMenuButton({
            menu_button: {
              type: 'web_app',
              text: '🛍️ Магазин ИИ',
              web_app: { url: webAppUrl }
            }
          });
          console.log('✅ Telegram Mini App Menu Button configured successfully via Cloudflare!');
        } catch (menuErr) {
          console.warn('Could not set chat menu button:', menuErr.message);
        }
      }

      process.once('SIGINT', () => bot.stop('SIGINT'));
      process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (botErr) {
      console.error('Telegram bot initialization error:', botErr);
    }
  }
}
