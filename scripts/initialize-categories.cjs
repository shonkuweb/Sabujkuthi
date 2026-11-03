const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

// Use the same database as the Prisma adapter, including the production volume.
const url = process.env.DATABASE_URL || `file:${process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'dev.db')}`;
if (!url.startsWith('file:')) throw new Error('This project requires a SQLite file DATABASE_URL.');
const db = new Database(url.slice(5));
try {
  db.transaction(() => {
    db.exec(`CREATE TABLE IF NOT EXISTS "Category" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "nameKey" TEXT NOT NULL,
      "image" TEXT NOT NULL DEFAULT '',
      "isVisible" BOOLEAN NOT NULL DEFAULT true,
      "isVisibleInNav" BOOLEAN NOT NULL DEFAULT true,
      "isVisibleInGrid" BOOLEAN NOT NULL DEFAULT true,
      "isVisibleInShopBy" BOOLEAN NOT NULL DEFAULT true
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
    CREATE UNIQUE INDEX IF NOT EXISTS "Category_nameKey_key" ON "Category"("nameKey");`);
    const categoryColumns = db.prepare('PRAGMA table_info(Category)').all();
    if (categoryColumns.length) {
      const categoryAdditions = {
        isVisibleInNav: 'BOOLEAN NOT NULL DEFAULT true',
        isVisibleInGrid: 'BOOLEAN NOT NULL DEFAULT true',
        isVisibleInShopBy: 'BOOLEAN NOT NULL DEFAULT true',
      };
      for (const [column, definition] of Object.entries(categoryAdditions)) {
        if (!categoryColumns.some(existing => existing.name === column)) db.exec(`ALTER TABLE Category ADD COLUMN "${column}" ${definition}`);
      }
    }
    const productColumns = db.prepare('PRAGMA table_info(Product)').all();
    if (productColumns.length) {
      const additions = {
        plantCare: 'TEXT',
        deliveryReturns: 'TEXT',
        deliveryNote: 'TEXT',
        deliveryPincodes: 'TEXT',
        replacementInfo: 'TEXT',
        deliveryInfo: 'TEXT',
        supportInfo: 'TEXT',
        packagingInfo: 'TEXT',
        soldLast24Hours: 'INTEGER',
        demoMetrics: 'BOOLEAN NOT NULL DEFAULT true',
        categoryId: 'TEXT REFERENCES Category(id) ON DELETE SET NULL',
        oldPrice: 'TEXT',
        inStock: 'BOOLEAN NOT NULL DEFAULT true',
        isPublished: 'BOOLEAN NOT NULL DEFAULT false',
        image2: 'TEXT',
      };
      for (const [column, definition] of Object.entries(additions)) {
        if (!productColumns.some(existing => existing.name === column)) db.exec(`ALTER TABLE Product ADD COLUMN "${column}" ${definition}`);
      }
      db.exec('CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId")');
    }
    db.exec(`CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY, "receipt" TEXT NOT NULL,
      "checkoutTokenHash" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
      "razorpayOrderId" TEXT, "razorpayPaymentId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending', "fulfillmentStatus" TEXT NOT NULL DEFAULT 'New',
      "customerName" TEXT NOT NULL, "phone" TEXT NOT NULL, "email" TEXT,
      "address" TEXT NOT NULL, "pincode" TEXT NOT NULL, "itemsJson" TEXT NOT NULL,
      "subtotal" INTEGER NOT NULL, "shipping" INTEGER NOT NULL, "total" INTEGER NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'INR', "paymentMode" TEXT NOT NULL,
      "paidAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_receipt_key" ON "Order"("receipt");
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_checkoutTokenHash_key" ON "Order"("checkoutTokenHash");
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_razorpayPaymentId_key" ON "Order"("razorpayPaymentId");
    CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");`);
    const orderColumns = db.prepare('PRAGMA table_info("Order")').all();
    if (!orderColumns.some(column => column.name === 'orderNumber')) db.exec('ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER');
    let lastNumber = Math.max(1000, db.prepare('SELECT MAX(orderNumber) AS number FROM "Order"').get().number || 0,
      Number(db.prepare("SELECT value FROM Settings WHERE key = 'order_number_sequence'").get()?.value) || 0);
    const assignNumber = db.prepare('UPDATE "Order" SET orderNumber = ? WHERE id = ?');
    for (const order of db.prepare('SELECT id FROM "Order" WHERE orderNumber IS NULL ORDER BY createdAt, rowid').all()) assignNumber.run(++lastNumber, order.id);
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber")');
    db.prepare("INSERT INTO Settings (key, value) VALUES ('order_number_sequence', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(lastNumber));
    const key = 'migration_categories_database_v1';
    if (!db.prepare('SELECT key FROM Settings WHERE key = ?').get(key)) {
      const legacyPath = path.join(process.cwd(), 'app/data/categories.json');
      const categories = fs.existsSync(legacyPath) ? JSON.parse(fs.readFileSync(legacyPath, 'utf8')) : [];
      if (!Array.isArray(categories)) throw new Error('Invalid legacy category data');
      const insert = db.prepare('INSERT OR IGNORE INTO Category (id, slug, name, nameKey, image, isVisible, isVisibleInNav, isVisibleInGrid, isVisibleInShopBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const category of categories) {
        const name = category.name?.trim();
        if (!name) continue;
        const id = String(category.id || randomUUID());
        insert.run(id, category.slug || `category-${id}`, name, name.toLocaleLowerCase(), category.image || '', category.isVisible === false ? 0 : 1, category.isVisibleInNav === false ? 0 : 1, category.isVisibleInGrid === false ? 0 : 1, category.isVisibleInShopBy === false ? 0 : 1);
      }
      db.prepare('INSERT INTO Settings (key, value) VALUES (?, ?)').run(key, 'complete');
    }
  })();
  console.log('Category database ready.');
} finally { db.close(); }
