import {CLOSED_UNPAID_PAYMENT_STATUSES} from './payment-status.js';

const UNPAID_CONTACT_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function validTime(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

// Retain the order ID, payment ID, amount and item/receipt evidence for accounting and disputes.
// Only direct contact details and the order-status token are removed here.
export function redactExpiredOrderContacts(orders, now = Date.now()) {
  let changed = false;
  const result = orders.map(order => {
    if (order.contactRedactedAt) return order;
    let deadline;
    if (order.status === 'paid') {
      const paidAt = validTime(order.paidAt);
      if (paidAt === null) return order; // Legacy order with no reliable paid date: review manually.
      deadline = Date.UTC(new Date(paidAt).getUTCFullYear() + 6, 0, 1);
    } else if (CLOSED_UNPAID_PAYMENT_STATUSES.includes(order.status)) {
      const closedAt = validTime(order.statusChangedAt);
      if (closedAt === null) return order; // Legacy order with no reliable closure date.
      deadline = closedAt + UNPAID_CONTACT_DAYS * DAY_MS;
    } else {
      return order; // Pending/review may be paid; reconcile with the gateway first.
    }
    if (now < deadline) return order;
    changed = true;
    return {
      ...order,
      email: null,
      telegramId: null,
      telegramUsername: null,
      accessToken: null,
      qrUrl: null,
      qrImage: null,
      privacyConsent: null,
      contactRedactedAt: new Date(now).toISOString()
    };
  });
  return {orders: result, changed};
}
