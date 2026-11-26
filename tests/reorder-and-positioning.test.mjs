import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';

test('database initializer assigns order columns and preserves existing product and category sequence', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-reorder-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    db.exec(`CREATE TABLE Category (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      name TEXT,
      nameKey TEXT UNIQUE,
      image TEXT DEFAULT '',
      isVisible BOOLEAN DEFAULT true,
      isVisibleInNav BOOLEAN DEFAULT true,
      isVisibleInGrid BOOLEAN DEFAULT true,
      isVisibleInShopBy BOOLEAN DEFAULT true
    )`);
    db.exec(`CREATE TABLE Product (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      title TEXT,
      price TEXT,
      inStock BOOLEAN DEFAULT true,
      isPublished BOOLEAN DEFAULT true,
      createdAt DATETIME,
      updatedAt DATETIME
    )`);

    // Insert categories and products with different creation times
    db.prepare(`INSERT INTO Category (id, slug, name, nameKey) VALUES (?, ?, ?, ?)`).run('c1', 'plants', 'Plants', 'plants');
    db.prepare(`INSERT INTO Category (id, slug, name, nameKey) VALUES (?, ?, ?, ?)`).run('c2', 'seeds', 'Seeds', 'seeds');

    db.prepare(`INSERT INTO Product (id, slug, title, price, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'p-old', 'old-plant', 'Old Plant', '400', '2026-01-01 10:00:00', '2026-01-01 10:00:00'
    );
    db.prepare(`INSERT INTO Product (id, slug, title, price, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'p-mid', 'mid-plant', 'Mid Plant', '500', '2026-02-01 10:00:00', '2026-02-01 10:00:00'
    );
    db.prepare(`INSERT INTO Product (id, slug, title, price, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'p-new', 'new-plant', 'New Plant', '600', '2026-03-01 10:00:00', '2026-03-01 10:00:00'
    );

    // Run additive initializer
    const initialize = () => execFileSync(process.execPath, ['scripts/initialize-categories.cjs'], {
      env: { ...process.env, DATABASE_URL: `file:${filename}` },
      stdio: 'pipe',
    });
    initialize();

    // Verify columns exist
    const catCols = db.prepare('PRAGMA table_info(Category)').all().map(c => c.name);
    const prodCols = db.prepare('PRAGMA table_info(Product)').all().map(c => c.name);
    assert.ok(catCols.includes('order'));
    assert.ok(catCols.includes('createdAt'));
    assert.ok(prodCols.includes('order'));

    // Verify old products appear first and new products appear last
    const products = db.prepare('SELECT id, title, "order" FROM Product ORDER BY "order" ASC, createdAt ASC').all();
    assert.equal(products[0].id, 'p-old');
    assert.equal(products[0].order, 0);
    assert.equal(products[1].id, 'p-mid');
    assert.equal(products[1].order, 1);
    assert.equal(products[2].id, 'p-new');
    assert.equal(products[2].order, 2);

    // Verify categories have sequential orders
    const categories = db.prepare('SELECT id, name, "order" FROM Category ORDER BY "order" ASC').all();
    assert.equal(categories[0].id, 'c1');
    assert.equal(categories[0].order, 0);
    assert.equal(categories[1].id, 'c2');
    assert.equal(categories[1].order, 1);

    // Re-running initializer is idempotent and does not overwrite orders
    initialize();
    const afterInit = db.prepare('SELECT id, "order" FROM Product ORDER BY "order" ASC').all();
    assert.equal(afterInit[0].order, 0);
    assert.equal(afterInit[2].order, 2);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('updating product details does not change order or position', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-reorder-update-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    db.exec(`CREATE TABLE Category (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE, name TEXT, nameKey TEXT UNIQUE,
      image TEXT DEFAULT '', isVisible BOOLEAN DEFAULT true, isVisibleInNav BOOLEAN DEFAULT true,
      isVisibleInGrid BOOLEAN DEFAULT true, isVisibleInShopBy BOOLEAN DEFAULT true, "order" INTEGER DEFAULT 0
    )`);
    db.exec(`CREATE TABLE Product (
      id TEXT PRIMARY KEY, slug TEXT UNIQUE, title TEXT, price TEXT,
      inStock BOOLEAN DEFAULT true, isPublished BOOLEAN DEFAULT true,
      "order" INTEGER DEFAULT 0, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.prepare(`INSERT INTO Product (id, slug, title, price, "order") VALUES (?, ?, ?, ?, ?)`).run('p1', 'alpha', 'Alpha Plant', '100', 0);
    db.prepare(`INSERT INTO Product (id, slug, title, price, "order") VALUES (?, ?, ?, ?, ?)`).run('p2', 'beta', 'Beta Plant', '200', 1);
    db.prepare(`INSERT INTO Product (id, slug, title, price, "order") VALUES (?, ?, ?, ?, ?)`).run('p3', 'gamma', 'Gamma Plant', '300', 2);

    // Update details of 'p1' (e.g. changing title to Z-Plant and price to 999)
    db.prepare(`UPDATE Product SET title = ?, price = ?, updatedAt = datetime('now') WHERE id = ?`).run('Z-Plant', '999', 'p1');

    // Query ordered by "order" ASC, createdAt ASC
    const products = db.prepare('SELECT id, title, "order" FROM Product ORDER BY "order" ASC, createdAt ASC').all();
    // 'p1' MUST still be first!
    assert.equal(products[0].id, 'p1');
    assert.equal(products[0].title, 'Z-Plant');
    assert.equal(products[1].id, 'p2');
    assert.equal(products[2].id, 'p3');

    // Simulate drag and drop reordering: move p3 to first position (order 0), p1 to 1, p2 to 2
    const newPositions = [{ id: 'p3', order: 0 }, { id: 'p1', order: 1 }, { id: 'p2', order: 2 }];
    const updateStmt = db.prepare('UPDATE Product SET "order" = ? WHERE id = ?');
    db.transaction(() => {
      for (const item of newPositions) {
        updateStmt.run(item.order, item.id);
      }
    })();

    const reordered = db.prepare('SELECT id, title, "order" FROM Product ORDER BY "order" ASC, createdAt ASC').all();
    assert.equal(reordered[0].id, 'p3');
    assert.equal(reordered[1].id, 'p1');
    assert.equal(reordered[2].id, 'p2');
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
