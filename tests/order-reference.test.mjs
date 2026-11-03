import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { orderReference } from '../lib/order-reference.mjs';
import { invoiceNumber } from '../lib/invoice.mjs';

test('short order and invoice references keep internal gateway receipts unchanged', () => {
  const order = { id: 'private-uuid', orderNumber: 1001, receipt: 'SK-legacy-gateway-reference' };
  assert.equal(orderReference(order), 'SK-1001');
  assert.equal(invoiceNumber(order), 'INV-SK-1001');
  assert.equal(order.receipt, 'SK-legacy-gateway-reference');
  assert.equal(orderReference({ receipt: 'old-reference' }), 'old-reference');
});

test('order counter migration is idempotent and allocation rolls back with checkout', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-orders-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const initialize = () => execFileSync(process.execPath, ['scripts/initialize-categories.cjs'], { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' });
    initialize();
    const allocate = () => db.prepare("UPDATE Settings SET value = CAST(value AS INTEGER) + 1 WHERE key = 'order_number_sequence' RETURNING value").get().value;
    assert.equal(db.transaction(allocate)(), '1001');
    assert.throws(() => db.transaction(() => { allocate(); throw new Error('Checkout failed'); })());
    initialize();
    assert.equal(db.transaction(allocate)(), '1002');
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
