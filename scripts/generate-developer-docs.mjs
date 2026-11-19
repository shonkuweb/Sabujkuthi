import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

// --- Color Palette ---
const C = {
  primary: '#1b4332',      // Deep Forest Green
  secondary: '#2d6a4f',    // Forest Emerald
  accent: '#40916c',       // Leaf Green
  accentLight: '#d8f3dc',  // Soft Mint Tint
  accentBg: '#f2f9f4',     // Very Light Sage Tint
  dark: '#0f172a',         // Deep Slate Dark
  text: '#334155',         // Charcoal Body Text
  muted: '#64748b',        // Slate Gray
  border: '#cbd5e1',       // Clean Border Line
  cardBg: '#f8fafc',       // Neutral Off-White Card
  cardBorder: '#e2e8f0',   // Card Border
  white: '#ffffff',
  highlight: '#b45309',    // Warm Amber
  highlightBg: '#fef3c7',  // Amber Background
  codeBg: '#0f172a',       // Code Editor Slate
  codeText: '#38bdf8',     // Sky Blue Code Text
};

// --- Fonts & Assets ---
const fontsDir = path.join(process.cwd(), 'public/fonts');
const fontRegular = fs.readFileSync(path.join(fontsDir, 'NotoSans-Regular.ttf'));
const fontBold = fs.readFileSync(path.join(fontsDir, 'NotoSans-Bold.ttf'));
const logoPath = path.join(process.cwd(), 'public/images/sabujkuthi-logo.png');

const outputFile = path.join(process.cwd(), 'SabujKuthi_Developer_Documentation.pdf');

console.log('Generating Developer Documentation PDF for SabujKuthi Nursery...');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 42, left: 40, right: 40 },
  bufferPages: true,
  info: {
    Title: 'SabujKuthi Nursery - Developer Documentation & System Architecture',
    Author: 'ShonkuWEB Technologies (Jit D & Isha Karmakar)',
    Subject: 'Technical Reference, Architecture, Database Schema & Developer Guide',
    Keywords: 'Next.js 15, React 19, SQLite, Prisma 7, Razorpay, Cloudflare R2, Architecture, Database Schema',
    Creator: 'ShonkuWEB (Developed by Jit D, Designed by Isha Karmakar)'
  }
});

doc.registerFont('Regular', fontRegular);
doc.registerFont('Bold', fontBold);

const writeStream = fs.createWriteStream(outputFile);
doc.pipe(writeStream);

const pageWidth = doc.page.width;
const pageHeight = doc.page.height;
const contentWidth = pageWidth - 80; // 515.28

// --- Helper Layout Functions ---

function startNewPage() {
  doc.addPage();
  doc.y = 56; // Standard top position for content pages with running headers
}

function ensureSpace(neededHeight) {
  if (doc.y + neededHeight > pageHeight - 50) {
    startNewPage();
  }
}

function drawSectionHeader(numberStr, title, subtitle) {
  ensureSpace(subtitle ? 50 : 38);
  doc.moveDown(0.2);
  const startY = doc.y;

  // Background accent bar
  doc.roundedRect(40, startY, contentWidth, 25, 4).fill(C.accentBg);
  doc.rect(40, startY, 4, 25).fill(C.primary);

  // Number badge & title
  doc.font('Bold').fontSize(11.5).fillColor(C.primary);
  doc.text(`${numberStr}  ${title.toUpperCase()}`, 52, startY + 5.5, { width: contentWidth - 24, lineBreak: false });

  doc.y = startY + 29;

  if (subtitle) {
    doc.font('Regular').fontSize(8.5).fillColor(C.muted);
    doc.text(subtitle, 40, doc.y, { width: contentWidth });
    doc.moveDown(0.3);
  }
}

function drawSubSection(title) {
  ensureSpace(32);
  doc.moveDown(0.3);
  const y = doc.y;
  doc.circle(44, y + 5.5, 2.5).fill(C.secondary);
  doc.font('Bold').fontSize(10).fillColor(C.secondary);
  doc.text(title, 52, y, { width: contentWidth - 14, lineBreak: false });
  doc.y = y + 15;
}

function drawParagraph(text, options = {}) {
  ensureSpace(20);
  doc.font('Regular').fontSize(options.fontSize || 8.5).fillColor(options.color || C.text);
  doc.text(text, doc.x, doc.y, {
    width: options.width || contentWidth,
    align: options.align || 'left',
    lineGap: options.lineGap || 2
  });
  doc.moveDown(options.moveDown !== undefined ? options.moveDown : 0.25);
}

function drawBullet(label, desc) {
  ensureSpace(18);
  const startY = doc.y;
  doc.font('Bold').fontSize(8.2).fillColor(C.primary);
  doc.text('• ' + label + ': ', 46, startY, { continued: true });
  doc.font('Regular').fontSize(8.2).fillColor(C.text);
  doc.text(desc, { width: contentWidth - 16, lineGap: 1.8 });
  doc.moveDown(0.2);
}

function drawCard(title, items, options = {}) {
  const cardPadding = 7;
  const itemHeight = options.compact ? 12 : 14;
  const titleHeight = title ? 18 : 6;
  const cardHeight = (items.length * itemHeight) + titleHeight + (cardPadding * 2) + (options.extraHeight || 0);

  ensureSpace(cardHeight + 4);

  const startY = doc.y;
  doc.roundedRect(40, startY, contentWidth, cardHeight, 5)
     .fillAndStroke(options.bg || C.cardBg, options.border || C.cardBorder);

  let curY = startY + cardPadding;
  if (title) {
    doc.font('Bold').fontSize(9).fillColor(C.primary);
    doc.text(title, 50, curY, { lineBreak: false });
    curY += 13;
    doc.moveTo(50, curY - 2).lineTo(40 + contentWidth - 10, curY - 2).strokeColor(C.border).lineWidth(0.5).stroke();
    curY += 4;
  }

  items.forEach(item => {
    doc.font('Bold').fontSize(7.8).fillColor(C.secondary);
    doc.text(item.label + ': ', 50, curY, { continued: true, lineBreak: false });
    doc.font('Regular').fontSize(7.8).fillColor(C.text);
    doc.text(item.value, { width: contentWidth - 25, lineBreak: false });
    curY += itemHeight;
  });

  doc.y = startY + cardHeight + (options.bottomGap || 6);
}

function drawTable(headers, rows, colWidths, options = {}) {
  const rowHeight = options.rowHeight || 16;
  let curY = doc.y;
  const startX = 40;

  // Check if header fits on current page
  if (curY + rowHeight * 2 > pageHeight - 50) {
    startNewPage();
    curY = doc.y;
  }

  // Header Row
  doc.roundedRect(startX, curY, contentWidth, rowHeight, 3).fill(C.primary);
  let curX = startX;
  headers.forEach((h, idx) => {
    doc.font('Bold').fontSize(7.8).fillColor(C.white);
    doc.text(h, curX + 5, curY + 4, { width: colWidths[idx] - 10, align: 'left', lineBreak: false });
    curX += colWidths[idx];
  });
  curY += rowHeight;

  // Data Rows
  rows.forEach((row, rIdx) => {
    if (curY + rowHeight > pageHeight - 50) {
      startNewPage();
      curY = doc.y;

      // Re-draw header on the new page
      doc.roundedRect(startX, curY, contentWidth, rowHeight, 3).fill(C.primary);
      let rX = startX;
      headers.forEach((h, idx) => {
        doc.font('Bold').fontSize(7.8).fillColor(C.white);
        doc.text(h, rX + 5, curY + 4, { width: colWidths[idx] - 10, align: 'left', lineBreak: false });
        rX += colWidths[idx];
      });
      curY += rowHeight;
    }

    const rowBg = rIdx % 2 === 0 ? C.white : C.cardBg;
    doc.rect(startX, curY, contentWidth, rowHeight).fillAndStroke(rowBg, C.cardBorder);

    let cellX = startX;
    row.forEach((cell, cIdx) => {
      const isBold = cIdx === 0 && options.boldFirstCol;
      doc.font(isBold ? 'Bold' : 'Regular').fontSize(7.2).fillColor(isBold ? C.dark : C.text);
      doc.text(String(cell), cellX + 5, curY + 3.8, { width: colWidths[cIdx] - 10, ellipsis: true, lineBreak: false });
      cellX += colWidths[cIdx];
    });
    curY += rowHeight;
  });

  doc.y = curY + (options.bottomGap || 6);
}

// =========================================================================
// PAGE 1: HERO HEADER, MANDATORY ATTRIBUTION, METADATA & SECTION 1
// =========================================================================

// Top decorative brand bar
doc.rect(0, 0, pageWidth, 6).fill(C.primary);

// Header Logo & Branding Container
const headerBoxY = 22;
doc.roundedRect(40, headerBoxY, contentWidth, 102, 7)
   .fillAndStroke(C.accentBg, C.accentLight);

// Display Official Website Logo
if (fs.existsSync(logoPath)) {
  doc.image(logoPath, 50, headerBoxY + 12, { width: 142 });
}

// Document Titles
doc.font('Bold').fontSize(15).fillColor(C.primary);
doc.text('SABUJKUTHI NURSERY', 204, headerBoxY + 12);

doc.font('Bold').fontSize(10.5).fillColor(C.secondary);
doc.text('DEVELOPER DOCUMENTATION & ARCHITECTURE', 204, headerBoxY + 31);

doc.font('Regular').fontSize(8).fillColor(C.muted);
doc.text('Production Specification • Release v1.0.0 • Engineering Reference Guide', 204, headerBoxY + 46);

// MANDATORY DEVELOPER & DESIGNER ATTRIBUTION BOX
doc.roundedRect(204, headerBoxY + 59, contentWidth - 172, 35, 4)
   .fillAndStroke(C.white, C.border);

doc.font('Bold').fontSize(7.8).fillColor(C.dark);
doc.text('DEVELOPED BY: ', 212, headerBoxY + 66, { continued: true });
doc.font('Bold').fontSize(7.8).fillColor(C.secondary);
doc.text('Co-Founder & Developer of ShonkuWEB JIT D');

doc.font('Bold').fontSize(7.8).fillColor(C.dark);
doc.text('DESIGNED BY: ', 212, headerBoxY + 79, { continued: true });
doc.font('Bold').fontSize(7.8).fillColor(C.secondary);
doc.text('Co-Founder & Designer Isha Karmakar');

doc.y = headerBoxY + 110;

// Project Quick Metadata Bar
const metaY = doc.y;
doc.roundedRect(40, metaY, contentWidth, 34, 4).fill(C.cardBg).stroke(C.cardBorder);

const metaCols = [
  { label: 'SOURCE REPOSITORY', val: 'https://github.com/shonkuweb/Sabujkuthi.git' },
  { label: 'PLATFORM STACK', val: 'Next.js 15.3 • React 19 • Prisma 7 • SQLite' },
  { label: 'DOCUMENT VERSION', val: 'v1.0.0 (Production Complete)' },
  { label: 'ORGANIZATION', val: 'ShonkuWEB Technologies' },
];

const colW = contentWidth / 4;
metaCols.forEach((m, idx) => {
  doc.font('Bold').fontSize(6.2).fillColor(C.muted);
  doc.text(m.label, 47 + idx * colW, metaY + 6);
  doc.font('Bold').fontSize(7.2).fillColor(C.primary);
  doc.text(m.val, 47 + idx * colW, metaY + 16, { width: colW - 10 });
});

doc.y = metaY + 40;

// SECTION 1: PROJECT OVERVIEW & SOURCE CODE REPOSITORIES
drawSectionHeader('1', 'Project Overview & Source Repositories', 'Core business identity, engineering mission, and source control governance.');

drawParagraph(
  'SabujKuthi Nursery is an enterprise-grade botanical e-commerce and nursery management system tailored specifically for horticulture, live plant retail, and gardening supplies in India. The application is built from first principles to provide lightning-fast page loading, zero-compromise transactional integrity, resilient local database persistence, and a modern customer shopping experience across mobile and desktop devices.'
);

drawCard('Source Code Repository & Version Control Governance', [
  { label: 'Primary GitHub Repository', value: 'https://github.com/shonkuweb/Sabujkuthi.git' },
  { label: 'Production Branch', value: 'main (Protected, verified with local build & test gates)' },
  { label: 'Technology Authorship', value: 'ShonkuWEB Technologies (Jit D, Co-Founder & Isha Karmakar, Co-Founder)' },
  { label: 'Nursery Headquarters', value: 'Nayabasat, West Bengal 721253, India (Phone: +91 89677 21082)' },
  { label: 'Architecture Philosophy', value: 'Zero client-trust pricing, integer-paise calculations, and embedded zero-latency database.' }
]);

drawSubSection('Core Engineering Pillars');
drawBullet('Zero Client-Trust Architecture', 'Client pricing, delivery charges, and discount totals submitted in cart payloads are never trusted; all computations are strictly recalculated on the server from the SQLite database.');
drawBullet('Integer-Paise Financial Precision', 'All transactions, line items, shipping fees, and discounts operate strictly on 64-bit integer paise (₹1 = 100 paise) to eliminate IEEE 754 floating-point inaccuracies.');
drawBullet('High-Speed Embedded SQLite with WAL', 'Utilizes better-sqlite3 with Write-Ahead Logging (WAL) mode for sub-millisecond local reads and concurrent transactions without the latency and operational burden of external SQL servers.');
drawBullet('Bilingual Vector Invoicing Engine', 'Native PDFKit engine capable of synthesizing downloadable tax invoices with full Bengali Unicode support and Rupee currency symbols.');

// Key Project Metrics Summary Card
drawCard('System Metrics & Architectural Highlights', [
  { label: 'Prisma Data Models', value: '11 Relational Models (Products, Categories, Orders, Affiliates, Customers, Blog, etc.)' },
  { label: 'Payment Gateway', value: 'Razorpay UPI & Cards with dual verification (Client Callback & Webhook reconciliation)' },
  { label: 'Media CDN Distribution', value: 'Cloudflare R2 Object Storage with S3-compatible API & zero egress bandwidth fees' },
  { label: 'Authentication Security', value: 'HMAC-SHA256 cryptographically signed session cookies with constant-time verification' }
], { bg: C.accentBg, border: C.accentLight });

// =========================================================================
// PAGE 2: TECHNOLOGY STACK & STRATEGIC RATIONALE
// =========================================================================
startNewPage();

drawSectionHeader('2', 'Technology Stack & Engineering Strategies', 'Complete inventory of technologies, frameworks, runtimes, and architectural rationale.');

drawParagraph(
  'Every dependency in SabujKuthi Nursery was deliberately chosen to balance developer velocity, runtime efficiency, zero-latency database operations, and high-conversion e-commerce performance.'
);

const techHeaders = ['Layer', 'Technology / Package', 'Version', 'Strategic Rationale & Architectural Choice'];
const techRows = [
  ['Framework', 'Next.js (App Router)', 'v15.3.1', 'Server Components (RSC) for instantaneous page loading, dynamic route handlers, SEO.'],
  ['UI Runtime', 'React & React DOM', 'v19.1.0', 'Modern component lifecycle, concurrent transitions, streaming SSR, optimized DOM diffing.'],
  ['Database Engine', 'SQLite + better-sqlite3', 'v12.11.1', 'Zero network latency, single-file durability, high throughput concurrent reads with WAL.'],
  ['ORM & Client', 'Prisma ORM + Adapter', 'v7.8.0', 'Type-safe schema modeling, automated query generation, transactional integrity.'],
  ['Payment Gateway', 'Razorpay API & Webhook', 'REST / SDK', 'Reliable UPI, NetBanking, Debit/Credit Card checkout with HMAC-SHA256 verification.'],
  ['Cloud Storage', 'Cloudflare R2 Object Store', '@aws-sdk/s3', 'Zero-egress fee S3-compatible cloud bucket for high-resolution botanical media distribution.'],
  ['PDF Engine', 'PDFKit', 'v0.20.2', 'Serverless vector PDF generation supporting bilingual typography (Noto Sans Bengali & English).'],
  ['Image Processing', 'browser-image-compression', 'v2.0.2', 'Client-side pre-upload compression minimizing server payload bandwidth and upload latency.'],
  ['Icons & Styling', 'React Icons & Global CSS', 'v5.6.0', 'Zero CSS-in-JS runtime overhead; hand-crafted responsive CSS modules and theme variables.']
];

drawTable(techHeaders, techRows, [75, 115, 55, 270.28], { boldFirstCol: true, rowHeight: 18 });

drawSubSection('Strategic Architectural Rationale');

drawCard('1. Next.js 15 App Router & Server Components (RSC)', [
  { label: 'Performance', value: 'Catalog and product pages render on the server, generating static HTML with zero client-side hydration cost for content blocks.' },
  { label: 'SEO Excellence', value: 'Automated sitemap.js and robots.js generation for plant taxonomy, high search visibility for rare botanical species.' },
  { label: 'Edge-Ready', value: 'Unified full-stack architecture eliminating external API gateways and redundant microservice hops.' }
]);

drawCard('2. SQLite with better-sqlite3 WAL Mode', [
  { label: 'Zero Latency', value: 'In-process database calls execute in sub-millisecond timescales, entirely avoiding network round-trips to remote databases.' },
  { label: 'Concurrency', value: 'WAL (Write-Ahead Logging) allows concurrent read requests to execute simultaneously with database writes.' },
  { label: 'Operational Simplicity', value: 'Single-file persistence (dev.db or /data/dev.db) makes container volume backup, snapshotting, and migrations trivial.' }
]);

drawCard('3. Zero Client-Trust & Integer-Paise Financial Math', [
  { label: 'Anti-Tampering', value: 'Clients send only product IDs and requested quantities; price lookup and calculations are executed exclusively server-side.' },
  { label: 'Exact Math', value: 'Integer arithmetic avoids floating point rounding bugs (e.g., 0.1 + 0.2 !== 0.3) across subtotal, coupons, and courier fees.' },
  { label: 'Double Verification', value: 'Orders require matching Razorpay payment ID, order ID, amount, and cryptographic HMAC-SHA256 signature.' }
]);

// =========================================================================
// PAGE 3: SYSTEM ARCHITECTURE & VISUAL FLOW DIAGRAMS
// =========================================================================
startNewPage();

drawSectionHeader('3', 'System Architecture & Data Flow Diagrams', 'Visual blueprints detailing system topology, payment lifecycle, and fulfillment pipeline.');

drawSubSection('3.1 End-to-End System Topology Diagram');

// DRAWING TOPOLOGY DIAGRAM
const diagY = doc.y;
const diagH = 150;
doc.roundedRect(40, diagY, contentWidth, diagH, 6).fillAndStroke(C.cardBg, C.border);

// Box 1: Clients
doc.roundedRect(50, diagY + 16, 82, 54, 4).fillAndStroke(C.white, C.secondary);
doc.font('Bold').fontSize(8).fillColor(C.primary).text('CLIENT DEVICES', 54, diagY + 23, { width: 74, align: 'center' });
doc.font('Regular').fontSize(6.5).fillColor(C.text).text('Mobile Browsers\nDesktop & Tablets\nWhatsApp Integrations', 54, diagY + 36, { width: 74, align: 'center' });

// Arrow 1 -> 2
doc.moveTo(132, diagY + 43).lineTo(158, diagY + 43).strokeColor(C.accent).lineWidth(1.5).stroke();
doc.polygon([158, diagY + 43], [153, diagY + 40], [153, diagY + 46]).fill(C.accent);

// Box 2: Edge CDN
doc.roundedRect(160, diagY + 16, 85, 54, 4).fillAndStroke(C.white, C.secondary);
doc.font('Bold').fontSize(8).fillColor(C.primary).text('EDGE & CDN', 164, diagY + 23, { width: 77, align: 'center' });
doc.font('Regular').fontSize(6.5).fillColor(C.text).text('Cloudflare DNS\nSSL/TLS 1.3 Termination\nStatic Asset Caching', 164, diagY + 36, { width: 77, align: 'center' });

// Arrow 2 -> 3
doc.moveTo(245, diagY + 43).lineTo(271, diagY + 43).strokeColor(C.accent).lineWidth(1.5).stroke();
doc.polygon([271, diagY + 43], [266, diagY + 40], [266, diagY + 46]).fill(C.accent);

// Box 3: Application Server
doc.roundedRect(273, diagY + 10, 137, 130, 4).fillAndStroke(C.accentBg, C.primary);
doc.font('Bold').fontSize(8.5).fillColor(C.primary).text('NEXT.JS 15 RUNTIME SERVER', 278, diagY + 15, { width: 127, align: 'center' });

// Sub-components inside server
doc.roundedRect(280, diagY + 30, 123, 26, 3).fillAndStroke(C.white, C.border);
doc.font('Bold').fontSize(7).fillColor(C.secondary).text('App Router & UI Layer', 282, diagY + 34, { width: 119, align: 'center' });
doc.font('Regular').fontSize(6).fillColor(C.text).text('Storefront, Catalog, Admin, Affiliate', 282, diagY + 44, { width: 119, align: 'center' });

doc.roundedRect(280, diagY + 60, 123, 26, 3).fillAndStroke(C.white, C.border);
doc.font('Bold').fontSize(7).fillColor(C.secondary).text('API Route Handlers & Security', 282, diagY + 64, { width: 119, align: 'center' });
doc.font('Regular').fontSize(6).fillColor(C.text).text('HMAC Sessions, Checkout, Webhooks', 282, diagY + 74, { width: 119, align: 'center' });

doc.roundedRect(280, diagY + 90, 123, 42, 3).fillAndStroke(C.white, C.border);
doc.font('Bold').fontSize(7).fillColor(C.secondary).text('Core Business & Invoicing Engine', 282, diagY + 94, { width: 119, align: 'center' });
doc.font('Regular').fontSize(6).fillColor(C.text).text('Shipping rules, discounts, regional filters, bilingual PDFKit invoicing', 282, diagY + 104, { width: 119, align: 'center' });

// Arrow 3 -> DB
doc.moveTo(410, diagY + 43).lineTo(434, diagY + 43).strokeColor(C.accent).lineWidth(1.5).stroke();
doc.polygon([434, diagY + 43], [429, diagY + 40], [429, diagY + 46]).fill(C.accent);

// Box 4: SQLite Database
doc.roundedRect(436, diagY + 16, 105, 54, 4).fillAndStroke(C.white, C.secondary);
doc.font('Bold').fontSize(8).fillColor(C.primary).text('PRISMA & SQLITE DB', 440, diagY + 23, { width: 97, align: 'center' });
doc.font('Regular').fontSize(6.5).fillColor(C.text).text('better-sqlite3 Engine\nPersistent Host Disk\nWAL High-Concurrency', 440, diagY + 36, { width: 97, align: 'center' });

// Arrow 3 -> Cloudflare R2
doc.moveTo(410, diagY + 85).lineTo(434, diagY + 85).strokeColor(C.accent).lineWidth(1.5).stroke();
doc.polygon([434, diagY + 85], [429, diagY + 82], [429, diagY + 88]).fill(C.accent);

// Box 5: Cloudflare R2
doc.roundedRect(436, diagY + 74, 105, 28, 4).fillAndStroke(C.white, C.border);
doc.font('Bold').fontSize(7.5).fillColor(C.primary).text('CLOUDFLARE R2 CDN', 440, diagY + 78, { width: 97, align: 'center' });
doc.font('Regular').fontSize(6).fillColor(C.muted).text('Botanical Media / S3 API', 440, diagY + 89, { width: 97, align: 'center' });

// Arrow 3 -> Razorpay
doc.moveTo(410, diagY + 120).lineTo(434, diagY + 120).strokeColor(C.accent).lineWidth(1.5).stroke();
doc.polygon([434, diagY + 120], [429, diagY + 117], [429, diagY + 123]).fill(C.accent);

// Box 6: Razorpay
doc.roundedRect(436, diagY + 108, 105, 28, 4).fillAndStroke(C.primary);
doc.font('Bold').fontSize(7.5).fillColor(C.white).text('RAZORPAY GATEWAY', 440, diagY + 112, { width: 97, align: 'center' });
doc.font('Regular').fontSize(6).fillColor(C.accentLight).text('Orders API & Webhook Capture', 440, diagY + 123, { width: 97, align: 'center' });

doc.y = diagY + diagH + 12;

drawSubSection('3.2 Payment Verification & Two-Phase Transaction Pipeline');

// DRAWING PAYMENT SEQUENCE
const seqY = doc.y;
const seqH = 92;
doc.roundedRect(40, seqY, contentWidth, seqH, 6).fillAndStroke(C.cardBg, C.border);

const steps = [
  { num: '1', title: 'Cart Checkout', desc: 'Customer submits details & requested plant quantities.' },
  { num: '2', title: 'Server Validation', desc: 'DB price check, regional delivery scan, coupon verification.' },
  { num: '3', title: 'Pending Order', desc: 'Atomic generation of SK-XXXX receipt & Razorpay order token.' },
  { num: '4', title: 'Payment Capture', desc: 'User completes UPI/Card; Razorpay fires webhook.' },
  { num: '5', title: 'HMAC Signature', desc: 'Server verifies SHA256 signature and captures payment.' },
  { num: '6', title: 'Confirmed & PDF', desc: 'Order status marked Paid; Bilingual PDF invoice generated.' },
];

const stepW = (contentWidth - 20) / 6;
steps.forEach((s, idx) => {
  const sx = 46 + idx * stepW;
  doc.circle(sx + 12, seqY + 16, 9).fill(C.secondary);
  doc.font('Bold').fontSize(8).fillColor(C.white).text(s.num, sx + 8, seqY + 12, { width: 8, align: 'center' });

  doc.font('Bold').fontSize(7.5).fillColor(C.primary).text(s.title, sx, seqY + 31, { width: stepW - 6, align: 'center' });
  doc.font('Regular').fontSize(6).fillColor(C.text).text(s.desc, sx, seqY + 43, { width: stepW - 6, align: 'center' });

  if (idx < 5) {
    doc.moveTo(sx + stepW - 6, seqY + 20).lineTo(sx + stepW + 2, seqY + 20).strokeColor(C.muted).lineWidth(1).stroke();
  }
});

doc.y = seqY + seqH + 12;

drawSubSection('3.3 Order Fulfillment State Lifecycle');

const states = [
  { state: 'Pending', desc: 'Order reserved; awaiting online payment clearance.', color: C.muted },
  { state: 'Paid / Confirmed', desc: 'Payment verified via HMAC webhook; stock reserved.', color: C.secondary },
  { state: 'Selection', desc: 'Botanical team hand-selects healthy nursery specimens.', color: '#0284c7' },
  { state: 'Packaging', desc: 'Moisture retention wrap & heavy-duty protective boxing.', color: '#b45309' },
  { state: 'Dispatched', desc: 'Transferred to courier with consignment tracking code.', color: '#7c3aed' },
  { state: 'Delivered', desc: 'Plant safely received; post-care WhatsApp support ready.', color: C.primary }
];

const stateW = (contentWidth - 10) / 6;
const stY = doc.y;
states.forEach((st, idx) => {
  const bx = 42 + idx * stateW;
  doc.roundedRect(bx, stY, stateW - 6, 42, 4).fillAndStroke(C.white, st.color);
  doc.font('Bold').fontSize(7.5).fillColor(st.color).text(st.state, bx + 2, stY + 6, { width: stateW - 10, align: 'center' });
  doc.font('Regular').fontSize(5.5).fillColor(C.text).text(st.desc, bx + 2, stY + 18, { width: stateW - 10, align: 'center' });
});

doc.y = stY + 50;

// =========================================================================
// PAGE 4: DETAILED SYSTEM DESIGN & SUBSYSTEM BREAKDOWN
// =========================================================================
startNewPage();

drawSectionHeader('4', 'Detailed System Design & Subsystems', 'Deep dive into presentation, state management, business rules, and security.');

drawSubSection('4.1 Frontend Presentation Layer & StoreShell Pattern');
drawParagraph(
  'The storefront UI is orchestrated via app/components/StoreShell.jsx. It encapsulates the announcement bar, responsive navbar, mobile drawer, search modal, and persistent cart flyout. Navigation circles for plant categories are dynamically loaded from visible database categories and rendered strictly on the homepage to preserve clean visual hierarchy on interior pages.'
);

drawSubSection('4.2 Dynamic Pricing, Shipping & Regional Validation Subsystem');
drawParagraph(
  'All business pricing and delivery logic resides in lib/payment-core.mjs, lib/shipping.mjs, and lib/indian-regions.mjs. It guarantees zero tampering through rigorous server-side evaluation:'
);
drawBullet('Shipping Calculation (lib/shipping.mjs)', 'Flat courier fee of ₹40 (4,000 paise) for orders under ₹3,999; 100% Free Courier Delivery for orders of ₹3,999 (399,900 paise) and above.');
drawBullet('Regional Shipping Scope (lib/indian-regions.mjs)', 'Live delicate specimens (such as grafted Adeniums or sensitive succulents) can be restricted to specific states or PIN codes. The server rejects checkout if the delivery address falls outside approved geographical zones.');
drawBullet('Coupon & Discount Engine (lib/discounts.mjs)', 'Supports percentage-off or flat rupee discounts, enforces minimum order values (minOrderValue), and validates category/product applicability.');

drawSubSection('4.3 Affiliate Marketing & Partner Commission Subsystem');
drawParagraph(
  'SabujKuthi features an integrated affiliate platform (app/affiliate, lib/affiliate-session.mjs). Content creators and gardening influencers register for custom coupon codes. When an order completes with their voucher, the system calculates their commission (fixed rupee or percentage) and records an immutable attribution link in the Order table.'
);

drawSubSection('4.4 Multilingual Automated PDF Invoicing Engine');
drawParagraph(
  'The invoicing subsystem in lib/invoice.mjs leverages PDFKit to synthesize on-demand branded invoices (downloadable at /api/admin/orders/[id]/invoice and customer order confirmation). To support customer names, Bengali street addresses, and local districts, the engine bundles Google Noto Sans and Noto Sans Bengali typefaces. It features automatic font-fallback switching, multi-page layout balancing, and rupee currency symbol rendering.'
);

drawSubSection('4.5 Cloudflare R2 Media Storage & Pre-Upload Optimization');
drawParagraph(
  'Image media is hosted on Cloudflare R2 object storage to ensure zero egress bandwidth charges. Uploads pass through lib/r2.mjs utilizing the AWS SDK S3 client. In the browser, browser-image-compression compresses uploaded photographs to under 800KB before transmission, safeguarding database responsiveness.'
);

drawSubSection('4.6 Security Architecture, RBAC & Cookie Integrity');
drawParagraph(
  'Administrative access (app/admin) and affiliate partner portals are guarded by HMAC-SHA256 signed expiring session cookies (lib/admin-session.mjs, lib/affiliate-session.mjs). Public customer order confirmation requires a 64-character SHA-256 hashed checkout ownership token (checkoutTokenHash), preventing order enumeration or unauthorized receipt exposure.'
);

// =========================================================================
// PAGE 5: DATABASE SCHEMA (PART 1: SETTINGS, PRODUCT, CATEGORIES)
// =========================================================================
startNewPage();

drawSectionHeader('5', 'Database Schema Specification (Part 1)', 'Data dictionary for core system configuration, botanical inventory, and category taxonomy.');

drawParagraph(
  'SabujKuthi Nursery utilizes Prisma 7.8.0 with the @prisma/adapter-better-sqlite3 adapter. Below is the comprehensive data dictionary defining models, constraints, data types, and relational indexes.'
);

// MODEL 1: SETTINGS
drawSubSection('5.1 Settings Model (Key-Value Configuration)');
drawTable(
  ['Field', 'Type', 'Constraint', 'Description'],
  [
    ['key', 'String', '@id (Primary Key)', 'Configuration key (e.g. order_number_sequence, hero_slides, video_section).'],
    ['value', 'String', 'Required', 'JSON-stringified configuration object or sequence counter integer value.']
  ],
  [100, 75, 110, 230.28],
  { boldFirstCol: true, rowHeight: 16 }
);

// MODEL 2: PRODUCT
drawSubSection('5.2 Product Model (Nursery Inventory & Botanical Catalog)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique UUID primary key identifier.'],
    ['slug', 'String', '@unique', 'SEO URL slug for the plant or nursery product.'],
    ['title', 'String', 'Required', 'Commercial botanical title or supply name.'],
    ['price', 'String', 'Required', 'Display and billing price in Rupees (e.g. "299").'],
    ['oldPrice', 'String', 'Optional', 'Strikethrough MRP price for promotional displays.'],
    ['description', 'String', 'Optional', 'Full plant profile, potting instructions, and botanical details.'],
    ['plantCare', 'String', 'Optional', 'Sunlight, watering schedule, and soil recommendations.'],
    ['shippingScope', 'String', '@default("all_india")', 'Delivery eligibility: "all_india" or "restricted".'],
    ['deliveryStates', 'String', 'Optional', 'Comma-separated state codes eligible for shipment.'],
    ['deliveryPincodes', 'String', 'Optional', 'Specific pin code whitelist for perishable specimens.'],
    ['inStock', 'Boolean', '@default(true)', 'Availability flag for cart addition and order booking.'],
    ['isPublished', 'Boolean', '@default(false)', 'Visibility toggle in public storefront and category grids.'],
    ['soldLast24Hours', 'Int', 'Optional', 'Social proof counter for store activity.'],
    ['image / image2', 'String', 'Optional', 'Primary and secondary Cloudflare R2 media CDN URLs.'],
    ['adeniumOptions', 'String', 'Optional (JSON)', 'Grafted Adenium variety options (rootstock, colorways).'],
    ['categoryId', 'String', 'Foreign Key, SetNull', 'Primary category identifier referencing Category.id.'],
    ['createdAt / Upd', 'DateTime', 'now() / @updatedAt', 'Timestamp tracking record creation and modification.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 15.5 }
);

// MODEL 3: CATEGORY
drawSubSection('5.3 Category Model (Hierarchical Taxonomy Tree)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique Category UUID primary key.'],
    ['slug', 'String', '@unique', 'URL path segment (e.g. "adenium-plants", "bonsai").'],
    ['name / nameKey', 'String', 'Required / @unique', 'Display category name and normalized lookup key.'],
    ['parentId', 'String', 'Foreign Key, SetNull', 'Self-referencing parent category id for nested taxonomies.'],
    ['order', 'Int', '@default(0)', 'Sorting order position in menus and grids.'],
    ['image', 'String', '@default("")', 'Banner image / icon CDN URL.'],
    ['isVisible', 'Boolean', '@default(true)', 'Global category visibility toggle.'],
    ['isVisibleInNav', 'Boolean', '@default(true)', 'Toggle for display in top navigation dropdowns.'],
    ['isVisibleInGrid', 'Boolean', '@default(true)', 'Toggle for storefront category card grids.'],
    ['isVisibleInShopBy', 'Boolean', '@default(true)', 'Toggle for "Shop By Category" circular scrollbars.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 15.5 }
);

// MODEL 4: PRODUCTCATEGORY
drawSubSection('5.4 ProductCategory Model (Many-to-Many Composite Junction)');
drawTable(
  ['Field', 'Type', 'Constraint', 'Description'],
  [
    ['productId', 'String', 'Foreign Key, Cascade', 'References Product.id. Cascades on product deletion.'],
    ['categoryId', 'String', 'Foreign Key, Cascade', 'References Category.id. Cascades on category deletion.'],
    ['Composite ID', '@@id', '[productId, categoryId]', 'Composite primary key ensuring unique product-category pair.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 15.5 }
);

// =========================================================================
// PAGE 6: DATABASE SCHEMA (PART 2: ORDERS & AFFILIATE SUBSYSTEM)
// =========================================================================
startNewPage();

drawSectionHeader('5', 'Database Schema Specification (Part 2)', 'Data dictionary for financial transactions, fulfillment tracking, and partner affiliate marketing.');

// MODEL 5: ORDER
drawSubSection('5.5 Order Model (Transactions, Snapshots & Fulfillment)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique order UUID internal identifier.'],
    ['orderNumber', 'Int', '@unique', 'Human-readable integer sequence counter (e.g. 1001 for SK-1001).'],
    ['receipt', 'String', '@unique', 'Display reference format (e.g. "SK-1001").'],
    ['checkoutTokenHash', 'String', '@unique', 'SHA-256 hash of secret client token for secure receipt access.'],
    ['razorpayOrderId', 'String', '@unique, Optional', 'Razorpay internal order ID (order_XXXXXXXXXXXXXX).'],
    ['razorpayPaymentId', 'String', '@unique, Optional', 'Razorpay captured payment transaction ID (pay_XXXXXXXXXXXXXX).'],
    ['status', 'String', '@default("pending")', 'Payment state: "pending", "paid", "failed", "cancelled".'],
    ['fulfillmentStatus', 'String', '@default("New")', 'Lifecycle: "New", "Selection", "Packaging", "Dispatched", "Delivered".'],
    ['customerName', 'String', 'Required', 'Customer full name provided during checkout.'],
    ['phone', 'String', 'Required (Indexed)', 'Indian 10-digit mobile number for dispatch alerts.'],
    ['address / pincode', 'String', 'Required', 'Physical delivery address and validated 6-digit postal code.'],
    ['itemsJson', 'String', 'Required (JSON)', 'Immutable snapshot of purchased items, prices, and quantities.'],
    ['subtotal / total', 'Int', 'Required (Paise)', 'Subtotal and Final total stored in integer paise.'],
    ['shipping', 'Int', 'Required (Paise)', 'Courier delivery fee in integer paise (4000 or 0).'],
    ['affiliateId', 'String', 'Foreign Key, Optional', 'References AffiliateAccount.id for commission attribution.'],
    ['couponCode', 'String', 'Optional', 'Applied voucher or partner code (e.g. "SABUJ5").'],
    ['paidAt', 'DateTime', 'Optional', 'Timestamp of confirmed Razorpay payment capture.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 15.5 }
);

// MODEL 6: AFFILIATEACCOUNT
drawSubSection('5.6 AffiliateAccount Model (Partner Registry)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique affiliate partner UUID primary key.'],
    ['name / email', 'String', 'Required', 'Partner full name and correspondence email address.'],
    ['phone', 'String', '@unique (Indexed)', 'Mobile phone used as partner account login identifier.'],
    ['passwordHash', 'String', 'Required', 'Argon2/Bcrypt cryptographic password hash.'],
    ['couponCode', 'String', '@unique, Optional', 'Personal coupon assigned for audience referrals.'],
    ['status', 'String', '@default("pending")', 'Partner approval status: "pending", "approved", "rejected", "banned".'],
    ['social URLs', 'String', 'Optional', 'YouTube, Instagram, Facebook channel profile links.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 15.5 }
);

// MODEL 7: AFFILIATEPROGRAMME
drawSubSection('5.7 AffiliateProgramme Model (Commission Schemes & Vouchers)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique campaign programme UUID identifier.'],
    ['title / terms', 'String', 'Required / Optional', 'Programme marketing title and contractual legal terms.'],
    ['commissionType', 'String', '@default("percentage")', 'Commission model: "percentage" or "fixed" amount.'],
    ['commissionValue', 'Float', '@default(10.0)', 'Commission percentage (e.g. 10.0%) or fixed rupee amount.'],
    ['discountType', 'String', '@default("percentage")', 'Customer discount type: "percentage" or "fixed".'],
    ['discountValue', 'Float', '@default(5.0)', 'Discount awarded to buyers using partner coupon.'],
    ['scopeType', 'String', '@default("all")', 'Applicability: "all", "category", or "products".'],
    ['minOrderValue', 'Int', '@default(0)', 'Minimum cart order requirement in Rupees.'],
    ['status', 'String', '@default("active")', 'Programme activation toggle: "active" or "inactive".']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 15.5 }
);

// MODEL 8: AFFILIATEACCOUNTPROGRAMME
drawSubSection('5.8 AffiliateAccountProgramme Model (Partner-Programme Junction)');
drawTable(
  ['Field', 'Type', 'Constraint', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique junction record identifier.'],
    ['affiliateId', 'String', 'Foreign Key, Cascade', 'References AffiliateAccount.id.'],
    ['programmeId', 'String', 'Foreign Key, Cascade', 'References AffiliateProgramme.id.'],
    ['joinedAt', 'DateTime', '@default(now())', 'Timestamp when partner enrolled in commission campaign.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 15.5 }
);

// =========================================================================
// PAGE 7: DATABASE SCHEMA (PART 3: CUSTOMER, ANALYTICS, BLOG & ER MAPPING)
// =========================================================================
startNewPage();

drawSectionHeader('5', 'Database Schema Specification (Part 3)', 'Data dictionary for customer profiles, visitor metrics, SEO blog engine, and relational integrity.');

// MODEL 9: CUSTOMER
drawSubSection('5.9 Customer Model (Buyer Accounts & Credentials)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique customer profile UUID identifier.'],
    ['phone', 'String', '@unique (Indexed)', 'Registered Indian mobile phone number.'],
    ['passwordHash', 'String', 'Required', 'Securely hashed customer portal credentials.'],
    ['name / state / pin', 'String', 'Optional', 'Default customer shipping information.'],
    ['createdAt / Upd', 'DateTime', 'now() / @updatedAt', 'Account registration and last profile update timestamp.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 16 }
);

// MODEL 10: SITEVISIT
drawSubSection('5.10 SiteVisit Model (Traffic & Unique Visitor Analytics)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique analytics metric identifier.'],
    ['date', 'String', '@unique (YYYY-MM-DD)', 'Calendar day partition key.'],
    ['count', 'Int', '@default(1)', 'Aggregated daily page view impression counter.'],
    ['uniqueVisitors', 'Int', '@default(1)', 'De-duplicated daily unique visitor counter.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 16 }
);

// MODEL 11: BLOGPOST
drawSubSection('5.11 BlogPost Model (SEO & Gardening Knowledgebase)');
drawTable(
  ['Field', 'Type', 'Constraint / Default', 'Description'],
  [
    ['id', 'String', '@id @default(uuid())', 'Unique blog post UUID identifier.'],
    ['slug', 'String', '@unique', 'SEO friendly URL slug (e.g. "adenium-monsoon-care").'],
    ['title / excerpt', 'String', 'Required / Optional', 'Article headline and search summary snippet.'],
    ['content', 'String', 'Required', 'Markdown or rich HTML article body content.'],
    ['coverImage', 'String', 'Optional', 'Cloudflare R2 feature photograph URL.'],
    ['category / author', 'String', 'Plant Care / SabujKuthi', 'Topic category tag and attribution byline.'],
    ['isPublished', 'Boolean', '@default(true)', 'Public visibility flag on /blog listing.']
  ],
  [95, 75, 115, 230.28],
  { boldFirstCol: true, rowHeight: 16 }
);

drawSubSection('5.12 Relational Entity-Relationship (ER) Architecture');
drawParagraph(
  'The relational database schema is structured for strict referential integrity, cascading updates, and zero orphaned records:'
);

drawCard('Foreign Key Constraints & Relational Behaviors', [
  { label: 'Product -> Category', value: 'fields: [categoryId], references: [id], onDelete: SetNull (Catalog reorganization preserves products)' },
  { label: 'Category Hierarchy', value: 'fields: [parentId], references: [id], onDelete: SetNull (Subcategories promoted on parent deletion)' },
  { label: 'ProductCategory (Junction)', value: 'onDelete: Cascade for both Product and Category links (Automatic junction cleanup)' },
  { label: 'Order -> Affiliate', value: 'fields: [affiliateId], references: [id], onDelete: SetNull (Order financial history preserved)' },
  { label: 'Affiliate -> Programme', value: 'onDelete: Cascade on junction AffiliateAccountProgramme (Clean enrollment removal)' }
]);

drawBullet('Database Performance Indexes', 'Composite indexes on [status, createdAt], [phone], [slug], and foreign keys ensure fast lookups even under heavy concurrent traffic.');

// =========================================================================
// PAGE 8: SECURITY ARCHITECTURE & ENVIRONMENT CONFIGURATION
// =========================================================================
startNewPage();

drawSectionHeader('6', 'Security Architecture & Environment Configuration', 'Zero-credential exposure policy, cryptographic defenses, and sanitized environment variables.');

drawParagraph(
  'Security is designed directly into every subsystem. The application adheres to strict data privacy principles and never stores or logs plain-text payment credentials, cards, or banking passwords. In compliance with security standards, all sensitive production keys and IP addresses are excluded from documentation and managed via secure environment injection.'
);

drawCard('Cryptographic Defense & Compliance Standards', [
  { label: 'Session Integrity', value: 'HMAC-SHA256 signature stamping on all admin, affiliate, and customer cookies.' },
  { label: 'Constant-Time Equality', value: 'crypto.timingSafeEqual used for all signature validations to prevent timing attacks.' },
  { label: 'Order Privacy Isolation', value: 'Orders indexed by one-way checkoutTokenHash; no sequential ID exposure to clients.' },
  { label: 'Database Injection Immunity', value: '100% parameterized SQL execution via Prisma ORM preventing SQL injection.' },
  { label: 'Sensitive Data Masking', value: 'Production IPs, gateway secrets, and CDN master keys strictly isolated in .env.local.' }
]);

drawSubSection('6.1 Sanitized Environment Configuration Template');
drawParagraph(
  'The following template demonstrates all required environment keys without exposing confidential values. In production, these are injected via container orchestration or hosting vaults:'
);

const envHeaders = ['Environment Key', 'Classification', 'Description & Usage'];
const envRows = [
  ['ADMIN_PASSWORD', 'Authentication', 'Master administrative dashboard secret phrase.'],
  ['ADMIN_SESSION_SECRET', 'Cryptography', '256-bit random salt used to sign administrative JWT session cookies.'],
  ['CUSTOMER_SESSION_SECRET', 'Cryptography', 'Salt used for signing mobile customer authentication tokens.'],
  ['AFFILIATE_SESSION_SECRET', 'Cryptography', 'Salt used for affiliate partner dashboard sessions.'],
  ['DATABASE_URL', 'Database', 'Path to SQLite database file (e.g. file:./dev.db or file:/data/dev.db in Docker).'],
  ['RAZORPAY_KEY_ID', 'Payment Public', 'Merchant Key ID issued by Razorpay for checkout modal instantiation.'],
  ['RAZORPAY_KEY_SECRET', 'Payment Secret', 'Server-side private secret for creating orders and verifying payment signatures.'],
  ['RAZORPAY_WEBHOOK_SECRET', 'Payment Secret', 'Cryptographic secret for validating Razorpay webhook dispatch payloads.'],
  ['R2_ACCOUNT_ID', 'Storage Secret', 'Cloudflare account identifier for R2 object storage bucket access.'],
  ['R2_ACCESS_KEY_ID', 'Storage Secret', 'S3-compatible API access key credential for media uploads.'],
  ['R2_SECRET_ACCESS_KEY', 'Storage Secret', 'S3-compatible API secret key credential for media uploads.'],
  ['R2_BUCKET_NAME', 'Storage Config', 'Target R2 bucket identifier (default: chf-media).'],
  ['R2_PUBLIC_URL', 'Storage Public', 'Public CDN endpoint serving high-speed cached media assets.'],
  ['NEXT_PUBLIC_SITE_URL', 'Networking', 'Canonical public domain (e.g. https://sabujkuthi.com).'],
  ['APP_PORT', 'Container Port', 'Host port binding for Docker container deployment (default: 3005).']
];

drawTable(envHeaders, envRows, [140, 95, 280.28], { boldFirstCol: true, rowHeight: 16 });

// =========================================================================
// PAGE 9: OPERATIONS, LOCAL DEVELOPMENT & DOCKER DEPLOYMENT
// =========================================================================
startNewPage();

drawSectionHeader('7', 'Local Setup, Testing & Production Deployment', 'Step-by-step runbooks for local developer environment and containerized VPS hosting.');

drawSubSection('7.1 Developer Machine Setup Runbook');
drawParagraph('To set up the development environment locally, execute the following commands in the workspace root:');

const setupSteps = [
  { label: 'Clone Repository', val: 'git clone https://github.com/shonkuweb/Sabujkuthi.git && cd Sabujkuthi' },
  { label: 'Install Dependencies', val: 'npm install' },
  { label: 'Generate Prisma Client', val: 'npx prisma generate' },
  { label: 'Initialize Database', val: 'node scripts/initialize-categories.cjs' },
  { label: 'Launch Dev Server', val: 'npm run dev -- --port 3000' },
  { label: 'Execute Test Suite', val: 'npm test (runs node:test runner across tests/*.test.mjs)' },
  { label: 'Verify Production Build', val: 'npm run build' }
];

drawCard('Local Terminal Commands', setupSteps.map(s => ({ label: s.label, value: s.val })), { rowHeight: 14 });

drawSubSection('7.2 Production Docker & Container Deployment');
drawParagraph(
  'The repository includes an optimized standalone Dockerfile and docker-compose.yml configuration. Next.js is configured with output: "standalone" to produce a minimal production artifact containing only required node_modules and pre-compiled chunks.'
);

drawBullet('Persistent SQLite Data Volume', 'The container maps a persistent Docker host volume to /data/dev.db, ensuring database durability across container restarts, zero data loss, and seamless image updates.');
drawBullet('Startup Initializer Execution', 'Docker launch script automatically triggers additive database migrations and sequence verification prior to serving traffic.');
drawBullet('Automated Static Asset Cache', 'Public font assets, branding logos, and client bundles are copied into the standalone runner stage.');

drawCard('Production Deployment Commands', [
  { label: 'Build Docker Image', value: 'docker compose build' },
  { label: 'Start Application Stack', value: 'docker compose up -d' },
  { label: 'View Container Logs', value: 'docker compose logs -f app' },
  { label: 'Restart Application', value: 'docker compose restart app' }
]);

// Final Document Sign-off & Certification Card
doc.moveDown(0.3);
const signY = doc.y;
doc.roundedRect(40, signY, contentWidth, 62, 5).fillAndStroke(C.accentBg, C.accent);

doc.font('Bold').fontSize(9.5).fillColor(C.primary);
doc.text('DOCUMENTATION SIGN-OFF & ENGINEERING CERTIFICATION', 52, signY + 9, { lineBreak: false });

doc.font('Regular').fontSize(7.6).fillColor(C.text);
doc.text(
  'This developer documentation certifies the completion of SabujKuthi Nursery Version 1.0 Production Architecture. Engineered with precision by ShonkuWEB Technologies under the leadership of Jit D (Co-Founder & Developer) and Isha Karmakar (Co-Founder & Designer).',
  52,
  signY + 23,
  { width: contentWidth - 24, lineGap: 1.6 }
);

// =========================================================================
// RUNNING HEADERS & FOOTERS (ACROSS ALL PAGES)
// =========================================================================

const range = doc.bufferedPageRange();
const totalPages = range.count;

for (let i = range.start; i < range.start + totalPages; i++) {
  doc.switchToPage(i);
  doc.page.margins.top = 0;
  doc.page.margins.bottom = 0;

  // RUNNING HEADER (On page 2 and later)
  if (i > range.start) {
    doc.rect(40, 18, contentWidth, 0.75).fill(C.border);

    // Small Logo / Mark
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 22, { width: 62 });
    }

    doc.font('Bold').fontSize(7).fillColor(C.primary);
    doc.text('SABUJKUTHI NURSERY • DEVELOPER & ARCHITECTURE REFERENCE', 110, 26, { lineBreak: false });

    doc.font('Regular').fontSize(6.5).fillColor(C.muted);
    doc.text('Dev: JIT D • Design: ISHA KARMAKAR (ShonkuWEB)', 310, 26, { width: contentWidth - 270, align: 'right', lineBreak: false });

    doc.rect(40, 39, contentWidth, 0.5).fill(C.border);
  }

  // RUNNING FOOTER (On all pages)
  const footerY = pageHeight - 25;
  doc.rect(40, footerY - 5, contentWidth, 0.5).fill(C.border);

  doc.font('Regular').fontSize(6.5).fillColor(C.muted);
  doc.text('SabujKuthi Nursery • Version 1.0.0 • Developed by ShonkuWEB', 40, footerY, { lineBreak: false });

  doc.font('Bold').fontSize(7).fillColor(C.primary);
  doc.text(`Page ${i + 1} of ${totalPages}`, 40, footerY, { width: contentWidth, align: 'right', lineBreak: false });
}

doc.end();

writeStream.on('finish', () => {
  console.log(`\nDeveloper Documentation PDF successfully generated!`);
  console.log(`Saved to: ${outputFile}`);
  console.log(`Total Pages: ${totalPages}`);
});
