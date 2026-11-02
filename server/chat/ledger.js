import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {PACK_TOKENS, PROVIDERS, codeForPayment, codeHash, reservationFor, trimmedHistory, validCode} from './core.js';

const schema = `
CREATE TABLE IF NOT EXISTS chat_accounts (
  telegram_id BIGINT PRIMARY KEY,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  debt BIGINT NOT NULL DEFAULT 0 CHECK (debt >= 0),
  provider TEXT NOT NULL DEFAULT 'openai',
  history JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_vouchers (
  code_hash CHAR(64) PRIMARY KEY,
  buyer_id BIGINT NOT NULL,
  source_payment_id TEXT NOT NULL UNIQUE,
  tokens INTEGER NOT NULL CHECK (tokens > 0),
  redeemed_by BIGINT,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_requests (
  id UUID PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  message_id BIGINT NOT NULL,
  provider TEXT NOT NULL,
  reserved INTEGER NOT NULL CHECK (reserved > 0),
  charged INTEGER,
  answer TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  UNIQUE (telegram_id, message_id)
);
CREATE INDEX IF NOT EXISTS chat_requests_lookup ON chat_requests (telegram_id,status);
`;

function validId(id) {return Number.isSafeInteger(Number(id)) && Number(id) > 0;}

export function createChatLedger({connectionString, codeSecret, pool} = {}) {
  if (!pool && !connectionString) throw new Error('CHAT_DATABASE_URL is required');
  if (!codeSecret || codeSecret.length < 32) throw new Error('CHAT_CODE_SECRET must have at least 32 characters');
  const db = pool || new Pool({connectionString, max: 5, connectionTimeoutMillis: 5000});

  async function transaction(fn) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {client.release();}
  }

  async function ensureAccount(client, id) {
    await client.query('INSERT INTO chat_accounts (telegram_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
    const {rows} = await client.query('SELECT * FROM chat_accounts WHERE telegram_id=$1 FOR UPDATE', [id]);
    return rows[0];
  }

  return {
    async migrate() {await db.query(schema);},
    async close() {if (!pool) await db.end();},
    // Only a future server-side, provider-verified payment handler may call this.
    // No public route issues vouchers while chat checkout is disabled.
    async issuePaidVoucher({buyerId,paymentId}) {
      if (!validId(buyerId) || typeof paymentId !== 'string' || !/^AI-[0-9a-f-]{36}$/.test(paymentId)) throw new Error('Invalid payment reference');
      return transaction(async client => {
        const {rows} = await client.query('SELECT buyer_id FROM chat_vouchers WHERE source_payment_id=$1 FOR UPDATE', [paymentId]);
        if (rows.length && String(rows[0].buyer_id) !== String(buyerId)) throw new Error('Payment owner mismatch');
        const code = codeForPayment(codeSecret, paymentId);
        if (!rows.length) await client.query('INSERT INTO chat_vouchers (code_hash,buyer_id,source_payment_id,tokens) VALUES ($1,$2,$3,$4)',
          [codeHash(code), buyerId, paymentId, PACK_TOKENS]);
        return code;
      });
    },
    async codesForBuyer(buyerId) {
      if (!validId(buyerId)) return [];
      const {rows} = await db.query("SELECT source_payment_id,redeemed_at FROM chat_vouchers WHERE buyer_id=$1 ORDER BY created_at DESC LIMIT 10", [buyerId]);
      return rows.map(row => ({code: codeForPayment(codeSecret, row.source_payment_id), redeemed: !!row.redeemed_at}));
    },
    async createDemoCode(buyerId) {
      if (!validId(buyerId)) throw new Error('Invalid user');
      const source = `demo:${randomUUID()}`;
      const code = codeForPayment(codeSecret, source);
      await db.query('INSERT INTO chat_vouchers (code_hash,buyer_id,source_payment_id,tokens) VALUES ($1,$2,$3,$4)',
        [codeHash(code), buyerId, source, PACK_TOKENS]);
      return code;
    },
    async redeem(code, buyerId) {
      if (!validCode(code) || !validId(buyerId)) return {status:'invalid'};
      return transaction(async client => {
        const {rows} = await client.query('SELECT * FROM chat_vouchers WHERE code_hash=$1 FOR UPDATE', [codeHash(code)]);
        const voucher = rows[0];
        if (!voucher || String(voucher.buyer_id) !== String(buyerId)) return {status:'invalid'};
        if (voucher.redeemed_by) return {status:'already'};
        const account = await ensureAccount(client, buyerId);
        const debt = Number(account.debt);
        const credited = Math.max(0, Number(voucher.tokens) - debt);
        const remainingDebt = Math.max(0, debt - Number(voucher.tokens));
        await client.query('UPDATE chat_accounts SET balance=balance+$2,debt=$3,updated_at=now() WHERE telegram_id=$1', [buyerId, credited, remainingDebt]);
        await client.query('UPDATE chat_vouchers SET redeemed_by=$2,redeemed_at=now() WHERE code_hash=$1', [codeHash(code), buyerId]);
        return {status:'redeemed', credited, balance:Number(account.balance)+credited};
      });
    },
    async account(telegramId) {
      if (!validId(telegramId)) throw new Error('Invalid user');
      const {rows} = await db.query('SELECT balance,debt,provider FROM chat_accounts WHERE telegram_id=$1', [telegramId]);
      return rows[0] ? {balance:Number(rows[0].balance),debt:Number(rows[0].debt),provider:rows[0].provider} : {balance:0,debt:0,provider:'openai'};
    },
    async lastAnswer(telegramId) {
      if (!validId(telegramId)) throw new Error('Invalid user');
      const {rows} = await db.query("SELECT answer,charged FROM chat_requests WHERE telegram_id=$1 AND status='completed' ORDER BY finished_at DESC LIMIT 1", [telegramId]);
      return rows[0] || null;
    },
    async chooseProvider(telegramId, provider) {
      if (!validId(telegramId) || !PROVIDERS.includes(provider)) throw new Error('Invalid provider');
      await db.query('INSERT INTO chat_accounts (telegram_id,provider) VALUES ($1,$2) ON CONFLICT (telegram_id) DO UPDATE SET provider=$2,updated_at=now()', [telegramId, provider]);
    },
    async clearHistory(telegramId) {
      return transaction(async client => {
        const account = await ensureAccount(client, telegramId);
        if ((await client.query("SELECT 1 FROM chat_requests WHERE telegram_id=$1 AND status='reserved' LIMIT 1", [telegramId])).rowCount) return false;
        const history = {...account.history, [account.provider]:[]};
        await client.query('UPDATE chat_accounts SET history=$2,updated_at=now() WHERE telegram_id=$1', [telegramId, JSON.stringify(history)]);
        return true;
      });
    },
    async reserve({telegramId,messageId,prompt}) {
      if (!validId(telegramId) || !Number.isSafeInteger(messageId) || messageId <= 0 || typeof prompt !== 'string') throw new Error('Invalid request');
      return transaction(async client => {
        const account = await ensureAccount(client, telegramId);
        if ((await client.query('SELECT 1 FROM chat_requests WHERE telegram_id=$1 AND message_id=$2', [telegramId,messageId])).rowCount) return {status:'duplicate'};
        if ((await client.query("SELECT 1 FROM chat_requests WHERE telegram_id=$1 AND status='reserved' LIMIT 1", [telegramId])).rowCount) return {status:'busy'};
        if (Number(account.debt) > 0) return {status:'insufficient'};
        const provider = PROVIDERS.includes(account.provider) ? account.provider : 'openai';
        const history = trimmedHistory(account.history?.[provider]);
        const reserved = reservationFor(history, prompt);
        if (Number(account.balance) < reserved) return {status:'insufficient', needed:reserved};
        const id = randomUUID();
        await client.query('UPDATE chat_accounts SET balance=$2,updated_at=now() WHERE telegram_id=$1', [telegramId,Number(account.balance)-reserved]);
        await client.query("INSERT INTO chat_requests (id,telegram_id,message_id,provider,reserved,status) VALUES ($1,$2,$3,$4,$5,'reserved')",
          [id,telegramId,messageId,provider,reserved]);
        return {status:'reserved',id,provider,history,reserved};
      });
    },
    async finish({id,telegramId,prompt,answer,usage}) {
      if (!Number.isSafeInteger(usage) || usage <= 0) throw new Error('Invalid token usage');
      return transaction(async client => {
        const {rows} = await client.query('SELECT * FROM chat_requests WHERE id=$1 FOR UPDATE', [id]);
        const request = rows[0];
        if (!request || String(request.telegram_id) !== String(telegramId)) throw new Error('Request not found');
        if (request.status !== 'reserved') return {status:request.status};
        const account = await ensureAccount(client, telegramId);
        const available = Number(account.balance) + Number(request.reserved);
        const debt = Math.max(0, usage - available);
        const balance = Math.max(0, available - usage);
        const history = {...account.history};
        history[request.provider] = trimmedHistory([...(history[request.provider] || []), {role:'user',text:prompt}, {role:'assistant',text:answer}]);
        await client.query('UPDATE chat_accounts SET balance=$2,debt=debt+$3,history=$4,updated_at=now() WHERE telegram_id=$1',
          [telegramId,balance,debt,JSON.stringify(history)]);
        await client.query("UPDATE chat_requests SET status='completed',charged=$2,answer=$3,finished_at=now() WHERE id=$1", [id,usage,answer]);
        return {status:'completed',charged:usage,balance,debt:Number(account.debt)+debt};
      });
    },
    async fail(id) {
      return transaction(async client => {
        const {rows} = await client.query('SELECT * FROM chat_requests WHERE id=$1 FOR UPDATE', [id]);
        const request = rows[0];
        if (!request || request.status !== 'reserved') return false;
        await client.query('UPDATE chat_accounts SET balance=balance+$2,updated_at=now() WHERE telegram_id=$1', [request.telegram_id,request.reserved]);
        await client.query("UPDATE chat_requests SET status='failed',finished_at=now() WHERE id=$1", [id]);
        return true;
      });
    },
    async recoverStale() {
      const {rows} = await db.query("SELECT id FROM chat_requests WHERE status='reserved' AND created_at < now()-interval '10 minutes' LIMIT 100");
      for (const row of rows) await this.fail(row.id);
      return rows.length;
    },
  };
}
