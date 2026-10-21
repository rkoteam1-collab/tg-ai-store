import {createHmac} from 'node:crypto';
export const TELEGRAM_WEBHOOK_PATH='/api/telegram/webhook';
export function webhookSecret(token){return token?createHmac('sha256',token).update('ai-store-telegram-webhook-v1').digest('hex'):'';}
