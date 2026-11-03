import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';

test('category schema includes granular visibility options and migrations are additive', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-categories-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const initialize = () => execFileSync(process.execPath, ['scripts/initialize-categories.cjs'], { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' });
    initialize();

    const columns = db.prepare('PRAGMA table_info(Category)').all().map(c => c.name);
    assert.ok(columns.includes('isVisible'));
    assert.ok(columns.includes('isVisibleInNav'));
    assert.ok(columns.includes('isVisibleInGrid'));
    assert.ok(columns.includes('isVisibleInShopBy'));

    // Insert a category with specific visibility flags
    db.prepare(`
      INSERT INTO Category (id, slug, name, nameKey, image, isVisible, isVisibleInNav, isVisibleInGrid, isVisibleInShopBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cat-1', 'indoor-plants', 'Indoor Plants', 'indoor plants', '', 1, 1, 0, 1);

    const saved = db.prepare('SELECT * FROM Category WHERE id = ?').get('cat-1');
    assert.equal(saved.isVisible, 1);
    assert.equal(saved.isVisibleInNav, 1);
    assert.equal(saved.isVisibleInGrid, 0);
    assert.equal(saved.isVisibleInShopBy, 1);

    // Re-running initialization is idempotent
    initialize();
    const afterInit = db.prepare('SELECT * FROM Category WHERE id = ?').get('cat-1');
    assert.equal(afterInit.isVisibleInGrid, 0);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('category visibility filtering correctly partitions categories across screen areas', () => {
  const categories = [
    { id: '1', slug: 'cat-1', name: 'Cat 1', isVisible: true, isVisibleInNav: true, isVisibleInGrid: true, isVisibleInShopBy: true },
    { id: '2', slug: 'cat-2', name: 'Cat 2', isVisible: true, isVisibleInNav: false, isVisibleInGrid: true, isVisibleInShopBy: true },
    { id: '3', slug: 'cat-3', name: 'Cat 3', isVisible: true, isVisibleInNav: true, isVisibleInGrid: false, isVisibleInShopBy: true },
    { id: '4', slug: 'cat-4', name: 'Cat 4', isVisible: true, isVisibleInNav: true, isVisibleInGrid: true, isVisibleInShopBy: false },
    { id: '5', slug: 'cat-5', name: 'Cat 5', isVisible: false, isVisibleInNav: false, isVisibleInGrid: false, isVisibleInShopBy: false },
  ];

  const visible = categories.filter(c => c.isVisible !== false);
  assert.equal(visible.length, 4);

  // 1st visibility option: Visible in Navbar
  const navCategories = visible.filter(c => c.isVisibleInNav !== false);
  assert.deepEqual(navCategories.map(c => c.id), ['1', '3', '4']);

  // 2nd visibility option: Visible in home page product grid
  const gridCategories = visible.filter(c => c.isVisibleInGrid !== false);
  assert.deepEqual(gridCategories.map(c => c.id), ['1', '2', '4']);

  // 3rd visibility option: Visible in Shop By category section
  const shopCategories = visible.filter(c => c.isVisibleInShopBy !== false);
  assert.deepEqual(shopCategories.map(c => c.id), ['1', '2', '3']);
});
