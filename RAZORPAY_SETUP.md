# Razorpay checkout

The storefront uses Razorpay Standard Checkout. Product prices, variants, shipping and totals are recalculated on the server using the configured SQLite database. Shipping is ₹40 below ₹3,999 and free from ₹3,999.

Local test credentials are stored only in the ignored `.env.local` file. No credentials belong in source control. The browser receives the Key ID, never the Key Secret, webhook secret or admin session secret.

## Environment

Use the variable names in `.env.example`. Production requires its own `ADMIN_SESSION_SECRET`, admin password, Razorpay keys and a separate webhook secret. Keep the database on a persistent volume; the existing startup initializer creates the order table without removing inventory or categories.

## Payment confirmation

A checkout attempt is stored as pending. The checkout response's signature is verified against the original Razorpay order ID. The server then fetches the payment from Razorpay and checks the order ID, amount and currency. Authorized payments are captured server-side; only captured payments mark the order paid. Repeated confirmations and webhooks are idempotent. Only paid records appear in Admin → Orders, and test payments are labelled.

Failed or dismissed checkouts preserve the cart. The checkout token stored in the customer's browser allows payment-status recovery. Paid order receipts require this token and do not expose customer details through public order URLs.

## Webhook setup before going live

Configure a publicly reachable HTTPS URL in the Razorpay dashboard:

`https://YOUR_DOMAIN/api/payments/razorpay/webhook`

Subscribe to `payment.captured` and `order.paid`. Enter the same secret as `RAZORPAY_WEBHOOK_SECRET`. This is separate from the API Key Secret. The raw webhook body is signature-verified, and payment details are independently fetched from Razorpay before recording a paid order.

Localhost cannot receive Razorpay webhooks directly. The local checkout callback and payment-status recovery work without a public webhook; configure the webhook on the deployed host to recover confirmations even if a customer closes their browser.

## Test checklist

1. Start the site and sign in again at `/admin/login` after the signed-session upgrade.
2. Add an in-stock product to the cart and enter a valid delivery address.
3. Complete a Razorpay test payment and confirm the receipt and the paid order in Admin → Orders.
4. Retry a failed or dismissed checkout and confirm the cart remains.
5. Confirm unpaid attempts never appear in Admin → Orders, and webhook retries never duplicate a paid order.
6. Test the webhook on the deployed HTTPS host before replacing test keys with live keys.
