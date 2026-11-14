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
        parentId: 'TEXT REFERENCES Category(id) ON DELETE SET NULL',
        order: 'INTEGER NOT NULL DEFAULT 0',
      };
      for (const [column, definition] of Object.entries(categoryAdditions)) {
        if (!categoryColumns.some(existing => existing.name === column)) db.exec(`ALTER TABLE Category ADD COLUMN "${column}" ${definition}`);
      }
      db.exec('CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId")');
    }
    const productColumns = db.prepare('PRAGMA table_info(Product)').all();
    if (productColumns.length) {
      const additions = {
        plantCare: 'TEXT',
        deliveryReturns: 'TEXT',
        deliveryNote: 'TEXT',
        deliveryPincodes: 'TEXT',
        shippingScope: "TEXT DEFAULT 'all_india'",
        deliveryStates: 'TEXT',
        replacementInfo: 'TEXT',
        deliveryInfo: 'TEXT',
        supportInfo: 'TEXT',
        packagingInfo: 'TEXT',
        soldLast24Hours: 'INTEGER',
        demoMetrics: 'BOOLEAN NOT NULL DEFAULT true',
        categoryId: 'TEXT REFERENCES Category(id) ON DELETE SET NULL',
        categoryIds: 'TEXT',
        oldPrice: 'TEXT',
        inStock: 'BOOLEAN NOT NULL DEFAULT true',
        isPublished: 'BOOLEAN NOT NULL DEFAULT false',
        image2: 'TEXT',
      };
      for (const [column, definition] of Object.entries(additions)) {
        if (!productColumns.some(existing => existing.name === column)) db.exec(`ALTER TABLE Product ADD COLUMN "${column}" ${definition}`);
      }
      db.exec('CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId")');
      db.exec(`CREATE TABLE IF NOT EXISTS "ProductCategory" (
        "productId" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        PRIMARY KEY ("productId", "categoryId"),
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");
      CREATE INDEX IF NOT EXISTS "ProductCategory_productId_idx" ON "ProductCategory"("productId");`);
      db.exec(`INSERT OR IGNORE INTO ProductCategory (productId, categoryId)
        SELECT id, categoryId FROM Product WHERE categoryId IS NOT NULL AND categoryId != '';`);
      db.exec(`UPDATE Product SET categoryIds = json_array(categoryId) WHERE (categoryIds IS NULL OR categoryIds = '') AND categoryId IS NOT NULL AND categoryId != '';`);
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
    CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
    CREATE INDEX IF NOT EXISTS "Order_phone_idx" ON "Order"("phone");
    CREATE TABLE IF NOT EXISTS "Customer" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "phone" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT,
      "state" TEXT,
      "pincode" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Customer_phone_key" ON "Customer"("phone");
    CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");
    CREATE TABLE IF NOT EXISTS "SiteVisit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TEXT NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 1,
      "uniqueVisitors" INTEGER NOT NULL DEFAULT 1
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "SiteVisit_date_key" ON "SiteVisit"("date");
    CREATE TABLE IF NOT EXISTS "BlogPost" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "excerpt" TEXT,
      "content" TEXT NOT NULL,
      "coverImage" TEXT,
      "category" TEXT DEFAULT 'Plant Care',
      "author" TEXT DEFAULT 'SabujKuthi Nursery',
      "isPublished" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
    CREATE INDEX IF NOT EXISTS "BlogPost_isPublished_createdAt_idx" ON "BlogPost"("isPublished", "createdAt");`);

    // Seed default blog articles if none exist
    const blogCount = db.prepare('SELECT COUNT(*) AS count FROM "BlogPost"').get().count;
    if (blogCount === 0) {
      const insertBlog = db.prepare(`INSERT INTO "BlogPost" (id, slug, title, excerpt, content, coverImage, category, author, isPublished, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      insertBlog.run(
        randomUUID(),
        'adenium-desert-rose-care-guide-india',
        'Complete Guide to Adenium Desert Rose Care in India: Sunlight, Soil & Watering',
        'Adenium, famously known as the Desert Rose, is one of the most rewarding blooming plants for Indian homes. Learn how to care for caudex, soil mix, and watering.',
        `Adenium obesum, popularly known as the Desert Rose or 'Bonsai of the Tropics', has earned massive popularity among gardening enthusiasts across India. With its sculptural swollen caudex and striking, vivid blooms, an Adenium looks like a living sculpture on your balcony or terrace.\n\n### 1. Optimal Sunlight Requirements\nAdeniums are desert-native succulents. They crave direct, unfiltered sunlight for at least 5 to 6 hours every day. Placed in full sun, the plant stays compact and develops abundant flower buds. If kept in partial shade, the branches become leggy and weak, and flowering drops significantly.\n\n### 2. Porous, Fast-Draining Soil Mix\nThe most critical aspect of growing healthy Adeniums is proper drainage. A waterlogged pot will cause fatal root and caudex rot within days. We recommend a porous growing medium:\n- 40% coarse river sand or cinder\n- 30% garden soil or red soil\n- 20% well-rotted cow dung compost or vermicompost\n- 10% perlite or neem cake powder\n\nEnsure the pot has large, unobstructed drainage holes at the bottom.\n\n### 3. Smart Watering Discipline\nFollow the 'soak and dry' method: water deeply until water drains from the bottom, then wait until the top 2 inches of soil feel completely dry before watering again. During the winter dormancy (December to January), reduce watering to once every 10–14 days.\n\n### 4. Feeding for Maximum Blooms\nApply an organic mixed fertilizer rich in phosphorus and potassium every 3 to 4 weeks during the growing season (February to October). A spoonful of bone meal combined with neem cake and potash works wonders for vibrant, multi-layered flowers.`,
        'https://images.unsplash.com/photo-1545241047-6083a3684587?w=1200&auto=format&fit=crop&q=80',
        'Plant Care',
        'SabujKuthi Nursery'
      );
      insertBlog.run(
        randomUUID(),
        'how-to-use-mixed-organic-fertilizer-blooms',
        'How to Use Mixed Organic Fertilizer for Spectacular Flowering & Root Health',
        'Discover the exact organic nutrient ratio and monthly feeding schedule that professional nursery growers use for robust plant growth and bountiful flowers.',
        `Every plant lover dreams of a garden filled with lush foliage and vibrant blooms. While chemical fertilizers offer quick bursts of green, they often deplete soil microbiology over time. That is why professional nursery growers rely on carefully balanced organic mixed fertilizers.\n\n### Why Balanced Mixed Fertilizer Matters\nUnlike single-source fertilizers, a specialized mixed fertilizer provides a holistic spectrum of primary macronutrients (Nitrogen, Phosphorus, Potassium) alongside secondary micronutrients like Calcium, Magnesium, and Zinc.\n\n- **Nitrogen (N):** Fuels vigorous new leaf growth and deep chlorophyll production.\n- **Phosphorus (P):** Stimulates strong, branching root systems and early flower bud set.\n- **Potassium (K):** Strengthens cell walls, disease resistance, and intensifies bloom colors.\n\n### Monthly Feeding Schedule for Potted Plants\n1. **Loosen the Topsoil:** Gently scratch the top 1–2 inches of soil around the rim of the pot, keeping away from the main stem.\n2. **Apply the Fertilizer:** For a standard 8–10 inch pot, sprinkle 2 tablespoons of mixed organic fertilizer evenly around the pot perimeter.\n3. **Mix & Water In:** Blend the fertilizer with the loosened topsoil and immediately water thoroughly to activate the microbial action.\n4. **Repeat Monthly:** Apply once every 25–30 days during active growing seasons.`,
        'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200&auto=format&fit=crop&q=80',
        'Fertilizers',
        'SabujKuthi Nursery'
      );
      insertBlog.run(
        randomUUID(),
        'monsoon-gardening-tips-potted-plants',
        'Monsoon Gardening Tips: Protecting Your Potted Plants from Root Rot and Pests',
        'Monsoon brings refreshing rains, but excess water can threaten potted plants. Follow these essential tips to keep your garden lush and rot-free during the rainy season.',
        `The monsoon season brings a welcome respite from the scorching summer heat, and outdoor gardens burst into vibrant shades of green. However, excessive rain and prolonged dampness also introduce serious challenges like root fungal rot, leaf spot, and pest infestations.\n\n### 1. Check and Clear Pot Drainage Holes\nPersistent rain will quickly drown plant roots if drainage holes are clogged with mud or compacted soil. Lift each pot and ensure water drains freely within seconds. Elevate pots using pot stands or bricks so water flows away easily.\n\n### 2. Move Sensitive Plants Under Semi-Shade\nSucculents, Adeniums, and delicate indoor plants cannot tolerate daily torrential rainfall. Move them under a balcony roof, verandah, or translucent greenhouse sheet where they get bright light without receiving direct downpours.\n\n### 3. Apply Organic Neem Oil Spray\nHigh humidity is the breeding ground for fungal spores, aphids, and caterpillars. Spray your plants every 10–12 days with a solution of cold-pressed neem oil (5 ml per litre of water mixed with 2 drops of mild liquid soap). Always spray early in the morning or late evening.\n\n### 4. Prune Yellowing and Decaying Leaves\nPrune away any dead, yellow, or soggy foliage near the soil surface. This improves air circulation around the plant base and prevents fungal spores from spreading to healthy stems.`,
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&auto=format&fit=crop&q=80',
        'Gardening Tips',
        'SabujKuthi Nursery'
      );
    }
    const customerColumns = db.prepare('PRAGMA table_info(Customer)').all();
    if (customerColumns.length) {
      if (!customerColumns.some(col => col.name === 'state')) db.exec('ALTER TABLE "Customer" ADD COLUMN "state" TEXT');
      if (!customerColumns.some(col => col.name === 'pincode')) db.exec('ALTER TABLE "Customer" ADD COLUMN "pincode" TEXT');
    }
    const orderColumns = db.prepare('PRAGMA table_info("Order")').all();
    if (!orderColumns.some(column => column.name === 'orderNumber')) db.exec('ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER');
    if (!orderColumns.some(column => column.name === 'couponCode')) db.exec('ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT');
    if (!orderColumns.some(column => column.name === 'affiliateId')) db.exec('ALTER TABLE "Order" ADD COLUMN "affiliateId" TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS "Order_affiliateId_idx" ON "Order"("affiliateId")');
    db.exec('CREATE INDEX IF NOT EXISTS "Order_couponCode_idx" ON "Order"("couponCode")');

    // Affiliate Tables
    db.exec(`CREATE TABLE IF NOT EXISTS "AffiliateAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "youtubeUrl" TEXT,
      "instagramUrl" TEXT,
      "facebookUrl" TEXT,
      "message" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "couponCode" TEXT,
      "warningMessage" TEXT,
      "banMessage" TEXT,
      "rejectReason" TEXT,
      "reviewedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateAccount_phone_key" ON "AffiliateAccount"("phone");
    CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateAccount_couponCode_key" ON "AffiliateAccount"("couponCode");
    CREATE INDEX IF NOT EXISTS "AffiliateAccount_status_createdAt_idx" ON "AffiliateAccount"("status", "createdAt");
    CREATE INDEX IF NOT EXISTS "AffiliateAccount_phone_idx" ON "AffiliateAccount"("phone");

    CREATE TABLE IF NOT EXISTS "AffiliateProgramme" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "commissionType" TEXT NOT NULL DEFAULT 'percentage',
      "commissionValue" REAL NOT NULL DEFAULT 10.0,
      "commissionPercent" REAL NOT NULL DEFAULT 10.0,
      "discountType" TEXT NOT NULL DEFAULT 'percentage',
      "discountValue" REAL NOT NULL DEFAULT 5.0,
      "discountPercent" REAL NOT NULL DEFAULT 5.0,
      "scopeType" TEXT NOT NULL DEFAULT 'all',
      "categoryId" TEXT,
      "productIds" TEXT,
      "minOrderValue" INTEGER DEFAULT 0,
      "startDate" TEXT,
      "endDate" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "terms" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "AffiliateAccountProgramme" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "affiliateId" TEXT NOT NULL,
      "programmeId" TEXT NOT NULL,
      "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("affiliateId") REFERENCES "AffiliateAccount"("id") ON DELETE CASCADE,
      FOREIGN KEY ("programmeId") REFERENCES "AffiliateProgramme"("id") ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "AffiliateAccountProgramme_unique" ON "AffiliateAccountProgramme"("affiliateId", "programmeId");
    CREATE INDEX IF NOT EXISTS "AffiliateAccountProgramme_affiliateId_idx" ON "AffiliateAccountProgramme"("affiliateId");
    CREATE INDEX IF NOT EXISTS "AffiliateAccountProgramme_programmeId_idx" ON "AffiliateAccountProgramme"("programmeId");`);

    const progColumns = db.prepare('PRAGMA table_info("AffiliateProgramme")').all();
    if (progColumns.length) {
      const additions = {
        commissionType: "TEXT NOT NULL DEFAULT 'percentage'",
        commissionValue: "REAL NOT NULL DEFAULT 10.0",
        discountType: "TEXT NOT NULL DEFAULT 'percentage'",
        discountValue: "REAL NOT NULL DEFAULT 5.0",
        scopeType: "TEXT NOT NULL DEFAULT 'all'",
        categoryId: "TEXT",
        productIds: "TEXT",
        minOrderValue: "INTEGER DEFAULT 0",
        startDate: "TEXT",
        endDate: "TEXT",
      };
      for (const [col, def] of Object.entries(additions)) {
        if (!progColumns.some(existing => existing.name === col)) {
          db.exec(`ALTER TABLE "AffiliateProgramme" ADD COLUMN "${col}" ${def}`);
        }
      }
    }

    // Seed default programme if none exists
    const programmeCount = db.prepare('SELECT COUNT(*) AS count FROM "AffiliateProgramme"').get().count;
    if (programmeCount === 0) {
      const insertProg = db.prepare(`INSERT INTO "AffiliateProgramme" (id, title, description, commissionPercent, discountPercent, status, terms, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      insertProg.run(
        randomUUID(),
        'SabujKuthi Creator Starter Programme',
        'Earn 10% commission on every order placed with your coupon code. Your audience enjoys 5% discount across all nursery plants and organic fertilizers.',
        10.0,
        5.0,
        'active',
        'Standard commission applied to all completed plant & fertilizer deliveries. Payouts disbursed monthly.'
      );
      insertProg.run(
        randomUUID(),
        'Bonsai & Rare Adenium Ambassador',
        'Special higher tier for passionate bonsai & caudex creators. 15% commission on grafted rare adenium collections.',
        15.0,
        10.0,
        'active',
        'Requires regular video/post mentions of exotic desert roses.'
      );
    }
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
