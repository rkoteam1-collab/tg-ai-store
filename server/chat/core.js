import {createHash, createHmac} from 'node:crypto';

export const PACK_TOKENS = 1_000_000;
export const PROVIDERS = ['openai', 'claude', 'gemini'];
export const MAX_OUTPUT_TOKENS = 512;
export const MAX_MESSAGE_CHARS = 2000;

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function codeForPayment(secret, chargeId) {
  if (!secret || secret.length < 32 || !chargeId) throw new Error('Chat code secret is missing');
  let value = BigInt(`0x${createHmac('sha256', secret).update(chargeId).digest('hex')}`);
  let code = '';
  for (let i = 0; i < 18; i++) {
    code += alphabet[Number(value % 62n)];
    value /= 62n;
  }
  return code;
}

export function codeHash(code) {
  return createHash('sha256').update(code).digest('hex');
}

export function validCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9]{18}$/.test(code);
}

export function trimmedHistory(history) {
  if (!Array.isArray(history)) return [];
  const result = [];
  let bytes = 0;
  for (const entry of history.slice(-12).reverse()) {
    if (!entry || !['user', 'assistant'].includes(entry.role) || typeof entry.text !== 'string') continue;
    const text = entry.text.slice(0, MAX_MESSAGE_CHARS);
    bytes += Buffer.byteLength(text);
    if (bytes > 7000) break;
    result.unshift({role: entry.role, text});
  }
  return result;
}

export function reservationFor(history, prompt) {
  const input = [...trimmedHistory(history).map(item => item.text), prompt].join('\n');
  // UTF-8 bytes plus ample protocol overhead and the bounded output. The
  // provider's reported usage, never this estimate, determines final debit.
  return Math.min(PACK_TOKENS, Buffer.byteLength(input) + MAX_OUTPUT_TOKENS + 4096);
}

export function providerUsage(provider, usage) {
  let total;
  if (provider === 'openai') total = usage?.total_tokens ?? (usage?.input_tokens + usage?.output_tokens);
  if (provider === 'claude') total = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0) + (usage?.cache_creation_input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0);
  if (provider === 'gemini') total = usage?.totalTokenCount ?? usage?.total_tokens;
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('Provider did not return valid token usage');
  return total;
}
