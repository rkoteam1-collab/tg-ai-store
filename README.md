# TG-AI-STORE

React + Express Telegram storefront. Node 24 recommended.

## Local development
npm ci
npm run build
npm test
npm start

Copy .env.example to .env and configure credentials outside Git. Never commit customer orders or secrets. For offline UI testing set BOT_ENABLED=false; actual payments require merchant credentials.

## Storage
Set DATA_DIR to a persistent private directory. JSON storage supports one application process. Back up all data before deployment. Render Free has ephemeral storage and cannot reliably retain orders, catalog edits or promos. A Russian primary data store is required for the intended Russian-customer workflow; hosting migration must be completed separately.

## Administration
Tap the logo three times or use the management icon. The server validates ADMIN_PIN or signed Telegram owner identity. Add, disable, enable and delete promo codes in the admin panel. Mutations require a short-lived bearer session.

## Payments
SBP remains enabled. Amounts and discounts are computed server-side; callbacks are verified against IT-Pay. Configure the four ITPAY_* receipt fields according to the registered cash register. Empty fields do not disable payment but omit client_receipt: independently verify merchant-side fiscalization. Digital goods in Telegram are subject to Telegram Stars platform rules.

Access delivery is manual. Review uncertain invoices with the payment provider; do not blindly retry. Monitor pending reservations and failed admin notifications. Never run more than one bot polling instance.
