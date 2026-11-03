# SabujKuthi Nursery

## Project and commands

This repository is an existing nursery ecommerce store. Extend its components and database-backed flows rather than replacing the app or adding sample catalogue data. The stack is Next.js 15 App Router, React 19, CSS modules/global CSS, Prisma 7, and SQLite through the better-sqlite3 adapter.

- `npm install` installs dependencies. After schema changes run `npx prisma generate`.
- `npm run dev -- --port 3000` runs the local site. Its predev script performs additive database initialization.
- `npm test` runs the Node test suite. `npm run build` checks the production build.
- Stop the development server before building; both use `.next`. Restart on port 3000 afterward.
- There is no configured ESLint setup; use the build and relevant tests for validation.

## Business identity and assets

`lib/business.mjs` is the source of business identity and WhatsApp URLs: SabujKuthi Nursery, +91 86370 54105, sabujkuthi@gmail.com, Nayabasat, West Bengal 721253, India. Do not reintroduce previous Mitali/Malati/Kiaan branding or contact details.

The header/invoice logo is `public/images/sabujkuthi-logo.png`. The white footer logo is `public/images/sabujkuthi-footer-logo.png`; preserve its placement adjustment for image padding. Invoice fonts, including Bengali and rupee support, are bundled in `public/fonts` with their license.

## Application map

- `app/providers.jsx`, `app/components/StoreShell.jsx`: shared customer shell, announcement, navbar, search, footer, menu and mobile cart. Admin is excluded from the storefront shell. Circular navbar categories appear on the homepage only. There is no bottom navigation bar.
- `app/components/Storefront.jsx`: category product grids, Shop By Category after the first two category sections, packing ticker, optional video cards, then customer reviews.
- `/collection`: all available store products with category filters. Plant collection/explore plants links point here. `/category/[slug]` lists a category. `/product/[slug]` shows product details.
- `app/components/ProductCard.jsx`: shared product card. `app/context/CartContext.jsx`, CartSidebar and FloatingCart manage the cart. The mobile floating cart is intentionally small.
- `/contact`: a simple name/message form opens a prepared WhatsApp message; the visitor sends it.
- `app/admin/page.js`: Inventory, Categories, Orders and Store Settings tabs. Components live in `app/admin/components`. Store Settings uses square tiles, two per mobile row, opening configuration dialogs.
- `OrdersPanel.jsx`: paid order cards with five stages, detail dialog, saved fulfilment slider, and invoice download.
- `lib/invoice.mjs`: branded PDFKit invoices from saved order snapshots; handles multiple pages and Bengali text. Download endpoint: `/api/admin/orders/[id]/invoice`.

## Catalogue and settings rules

Categories, product content, prices, availability, images and visibility must come from the configured database/admin forms. Do not hardcode fake products or categories. Only published products belonging to visible categories appear publicly or qualify for checkout. Product names, descriptions and prices must be real configured values. Demo reviews/viewer metrics are permitted only where already explicitly indicated as demo data.

The video section is configured through Store Settings, can be disabled, and renders horizontal video cards with minimal controls. Validation and YouTube helpers are in `lib/video-section.mjs` and `lib/youtube-player.js`.

## Database and safe changes

`prisma/schema.prisma` defines Product, Category, Settings and Order. `lib/prisma.js` uses `DATABASE_URL` (SQLite `file:` URL), falling back to `SQLITE_DB_PATH` or workspace `dev.db`. `scripts/initialize-categories.cjs` performs idempotent additive schema upgrades and the one-time legacy category migration. Update both the Prisma schema and initializer for new persistent columns, and regenerate Prisma. Do not run destructive schema resets or overwrite existing user catalogue/order data.

`dev.db` contains user-created records, including test payments. Never seed fake paid orders into it or alter a real order's status as a test. Use isolated temporary databases/fixtures for mutation tests. PDF QA intermediates belong in ignored `tmp/pdfs`; share only clearly fictional sample invoices, never customer data.

Human-readable order references are `SK-1001`, `SK-1002`, etc. `Order.orderNumber` is unique; a Settings counter (`order_number_sequence`) is incremented in the same transaction as order creation. The initializer assigns numbers to existing records without changing their original gateway receipts. Numbers can have gaps because pending/failed attempts also reserve one. `lib/order-reference.mjs` formats display references. Internal UUIDs, checkout ownership tokens and Razorpay IDs must remain intact. Invoices use `INV-SK-1001` style numbers.

## Payment and authentication invariants

- Razorpay checkout is implemented in `lib/payment-core.mjs`, `lib/payment-orders.js`, `lib/razorpay.mjs`, `/api/checkout/*` and `/api/payments/razorpay/webhook`. Checkout is a page/payment flow, not a WhatsApp order submission.
- Money is integer paise. Shipping is ₹40 below ₹3,999 and free from ₹3,999, centralized in `lib/shipping.mjs`.
- Calculate prices, variants, shipping and totals on the server from available database products. Never trust client prices or totals.
- Only verified, matching, captured payments mark orders paid. Confirm the Razorpay order/payment IDs, amount, currency and signature; preserve idempotence and concurrent-capture recovery.
- Only paid orders appear in admin or qualify for invoices. Fulfilment changes are separate from payment status: Confirmed → Selection → Packaging → Dispatched → Delivered (legacy statuses are mapped in `lib/order-status.mjs`).
- Invoices must use the saved order items/prices, never today's product prices. Do not invent tax identifiers or tax amounts.
- Admin sessions are signed/expiring via `lib/admin-session.mjs`. Middleware and every private API must check the signature. A plain `authenticated` cookie is insufficient. Customer order access requires the matching checkout token hash.
- `.env.local` contains credentials. Never echo, commit, embed in client code, or include them in documentation. `.env.example` documents variable names. Keep gateway secrets and webhook secret server-side. See `RAZORPAY_SETUP.md` for setup; live webhooks require a public HTTPS endpoint.
- Payment method badges come from the account's supported Razorpay methods endpoint; do not promise unsupported methods.

## Deployment and validation

Next uses standalone output. Docker regenerates Prisma, builds the app, copies public assets/native database dependencies, then runs `start.sh`. Production should point `DATABASE_URL` to the persistent SQLite volume (normally `file:/data/dev.db`). The startup initializer must run against that same database.

Validate relevant behavior with `npm test` and `npm run build`. Use isolated fixtures for checkout/invoice/order mutations. For invoice layout changes, render sample PDFs to images and inspect both normal and multipage orders, including Bengali text. Keep client/mobile layouts responsive and preserve existing user changes. Do not claim a payment was tested end to end unless an actual authorized test payment completed.
