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

## Frontend CDN and cache updates
The bot opens https://rkoteam1-collab.github.io/tg-ai-store/ with a release query. GitHub Actions builds/deploys the storefront CDN on main pushes. Backend API remains https://tg-ai-store.onrender.com; CORS permits only the storefront origin. The frontend build uses FRONTEND_BASE=/tg-ai-store/ and VITE_API_BASE_URL=https://tg-ai-store.onrender.com.

server/launch.js repairs the global menu and the configured ADMIN_ID menu at server startup. Increment APP_RELEASE with a storefront release to replace cached launch URLs. FRONTEND_URL can override the public storefront URL. WEBAPP_URL alone is retained as legacy deployment configuration; bot menus use FRONTEND_URL or the CDN default.

The catalog renders without waiting for the Telegram SDK or API. A cold Free backend can still delay live stock refresh, login, subscription verification and payment creation. These requests show a connection state and have timeouts. Backend sleep and durable storage require separate hosting changes.

## Repairing legacy Telegram buttons
Global menu updates cannot replace old per-chat menu overrides. Private incoming updates now clear the user's override to MenuButtonDefault, inheriting the global versioned CDN URL. /start also replaces the persistent reply keyboard. Old inline buttons embedded in historical messages are not globally editable without message IDs; users should request a fresh /start keyboard.

Telegram updates use a secret-protected webhook at /api/telegram/webhook. WEBAPP_URL (or BACKEND_URL) identifies the public backend endpoint. FRONTEND_URL identifies the CDN frontend. Webhook requests can wake the sleeping Free service; first delivery may still wait for the cold start/retry. For deliberate local polling set BOT_TRANSPORT=polling. Never run a polling instance against the production token when its webhook is enabled.

## Mini App loading recovery
The initial HTML contains a branded fallback and a small inline readiness bootstrap. It sends web_app_ready through the native Telegram bridge before React or the remote SDK can block startup. The bootstrap source and its CSP SHA-256 are shared by Vite and Express; keep them in sync through server/bootstrap.js. Startup failures show retry and backup links after ten seconds. React reports its first successful commit to cancel the watchdog and has an error boundary. Signed tgWebAppData can be read from the launch fragment when SDK loading fails; server HMAC validation remains mandatory.
