import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { normalizePhone, isValidPhone, hashPassword, verifyPassword } from '../lib/customer-auth.mjs';
import { createCustomerSession, verifyCustomerSession } from '../lib/customer-session.mjs';

test('phone normalization and validation handles spaces, prefixes, and dashes', () => {
  assert.equal(normalizePhone('+91 86370 54105'), '8637054105');
  assert.equal(normalizePhone('+91-86370-54105'), '8637054105');
  assert.equal(normalizePhone('918637054105'), '8637054105');
  assert.equal(normalizePhone('08637054105'), '8637054105');
  assert.equal(normalizePhone('8637054105'), '8637054105');

  assert.equal(isValidPhone('+91 86370 54105'), true);
  assert.equal(isValidPhone('8637054105'), true);
  assert.equal(isValidPhone('12345'), false);
  assert.equal(isValidPhone('abcdefghij'), false);
  assert.equal(isValidPhone('1234567890'), false); // Indian mobiles start with 5-9
});

test('customer password hashing and verification is secure and timing-safe', () => {
  const plain = 'secretPlantPass123';
  const hashed = hashPassword(plain);

  assert.notEqual(hashed, plain);
  assert.match(hashed, /^[a-f0-9]{32}:[a-f0-9]{128}$/);

  assert.equal(verifyPassword(plain, hashed), true);
  assert.equal(verifyPassword('wrongPassword', hashed), false);
  assert.equal(verifyPassword('', hashed), false);
  assert.equal(verifyPassword(plain, 'invalid:hash'), false);
});

test('customer session tokens encode payload, sign cryptographically, and reject tampering', async () => {
  const customer = { id: 'cust-12345', phone: '8637054105', name: 'Sourav' };
  const token = await createCustomerSession(customer);

  assert.equal(typeof token, 'string');
  const verified = await verifyCustomerSession(token);
  assert.ok(verified);
  assert.equal(verified.id, 'cust-12345');
  assert.equal(verified.phone, '8637054105');
  assert.equal(verified.name, 'Sourav');

  // Tampered payload
  const [b64, sig] = token.split('.');
  const tampered = `${b64.slice(0, -3)}abc.${sig}`;
  assert.equal(await verifyCustomerSession(tampered), null);

  // Invalid signature
  const fakeSig = sig.slice(0, -4) + '0000';
  assert.equal(await verifyCustomerSession(`${b64}.${fakeSig}`), null);
});

test('customer table creation in initialize script is additive and idempotent', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-cust-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const initialize = () => execFileSync(
      process.execPath,
      ['scripts/initialize-categories.cjs'],
      { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' }
    );

    initialize();
    const tableInfo = db.prepare('PRAGMA table_info(Customer)').all();
    assert.ok(tableInfo.some(c => c.name === 'id'));
    assert.ok(tableInfo.some(c => c.name === 'phone'));
    assert.ok(tableInfo.some(c => c.name === 'passwordHash'));

    // Insert customer
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('c1', '8637054105', 'salt:hash', 'User One');

    // Run initializer again — must not throw or overwrite
    initialize();
    const row = db.prepare('SELECT * FROM Customer WHERE id = ?').get('c1');
    assert.equal(row.phone, '8637054105');
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
