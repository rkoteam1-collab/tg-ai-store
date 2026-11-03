// Payment.status values documented for GET /v1/payments/{payment_id}/ by IT-Pay.
// Unknown statuses are not treated as terminal without an authoritative bank result.
// https://docs.gw.itpay.ru/
export const PAID_PAYMENT_STATUSES = Object.freeze(['paid', 'completed']);
export const CLOSED_UNPAID_PAYMENT_STATUSES = Object.freeze(['cancelled', 'rejected', 'error']);
export const KNOWN_PAYMENT_STATUSES = Object.freeze(['new','processing',...PAID_PAYMENT_STATUSES,...CLOSED_UNPAID_PAYMENT_STATUSES]);
