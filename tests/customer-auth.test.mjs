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
  assert.equal(normalizePhone('+91 89677 21082'), '8967721082');
  assert.equal(normalizePhone('+91-89677-21082'), '8967721082');
  assert.equal(normalizePhone('918967721082'), '8967721082');
  assert.equal(normalizePhone('08967721082'), '8967721082');
  assert.equal(normalizePhone('8967721082'), '8967721082');

  assert.equal(isValidPhone('+91 89677 21082'), true);
  assert.equal(isValidPhone('8967721082'), true);
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
  const customer = { id: 'cust-12345', phone: '8967721082', name: 'Sourav' };
  const token = await createCustomerSession(customer);

  assert.equal(typeof token, 'string');
  const verified = await verifyCustomerSession(token);
  assert.ok(verified);
  assert.equal(verified.id, 'cust-12345');
  assert.equal(verified.phone, '8967721082');
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
    assert.ok(tableInfo.some(c => c.name === 'email'));
    assert.ok(tableInfo.some(c => c.name === 'address'));
    assert.ok(tableInfo.some(c => c.name === 'state'));
    assert.ok(tableInfo.some(c => c.name === 'pincode'));
    assert.ok(tableInfo.some(c => c.name === 'isBanned'));
    assert.ok(tableInfo.some(c => c.name === 'banReason'));
    assert.ok(tableInfo.some(c => c.name === 'bannedAt'));
    assert.ok(tableInfo.some(c => c.name === 'lastActiveAt'));
    assert.ok(tableInfo.some(c => c.name === 'lastLoginAt'));

    // Insert customer with ban and activity fields
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, state, pincode, isBanned, banReason, bannedAt, lastActiveAt, lastLoginAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
      .run('c1', '8967721082', 'salt:hash', 'User One', 'West Bengal', '721253', 1, 'Policy violation: unpaid order refusals');

    // Run initializer again — must not throw or overwrite
    initialize();
    const row = db.prepare('SELECT * FROM Customer WHERE id = ?').get('c1');
    assert.equal(row.phone, '8967721082');
    assert.equal(row.isBanned, 1);
    assert.equal(row.banReason, 'Policy violation: unpaid order refusals');
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('signup password confirmation ensures matching passwords and rejects mismatch', () => {
  const validateSignupPasswords = (pass, confirm) => {
    if (!pass || pass.length < 6) return { valid: false, error: 'Password must be at least 6 characters long.' };
    if (!confirm) return { valid: false, error: 'Please enter your password again to confirm.' };
    if (pass !== confirm) return { valid: false, error: 'Passwords do not match. Please ensure both passwords are identical.' };
    return { valid: true };
  };

  assert.equal(validateSignupPasswords('secret123', 'secret123').valid, true);
  assert.equal(validateSignupPasswords('secret123', 'wrong456').valid, false);
  assert.equal(validateSignupPasswords('secret123', '').valid, false);
  assert.equal(validateSignupPasswords('short', 'short').valid, false);
});

test('banned customer account note is permanent and immutable', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-ban-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    execFileSync(
      process.execPath,
      ['scripts/initialize-categories.cjs'],
      { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' }
    );

    // Create an active customer
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, state, pincode, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('c-active', '9876543210', 'hash', 'Test Customer', 'West Bengal', '700001');

    // Ban function enforcing immutability of ban note
    const banCustomer = (customerId, note) => {
      const existing = db.prepare('SELECT id, isBanned, banReason FROM Customer WHERE id = ?').get(customerId);
      if (!existing) throw new Error('Customer not found');
      if (existing.isBanned) {
        throw new Error('The ban note cannot be modified after an account has been banned.');
      }
      if (!note || !note.trim()) throw new Error('A proper note is required when banning an account.');
      db.prepare('UPDATE Customer SET isBanned = 1, banReason = ?, bannedAt = CURRENT_TIMESTAMP WHERE id = ?')
        .run(note.trim(), customerId);
      return { success: true };
    };

    // First ban with proper note succeeds
    const result = banCustomer('c-active', 'Repeated order disputes and abusive language');
    assert.equal(result.success, true);

    const bannedRow = db.prepare('SELECT isBanned, banReason FROM Customer WHERE id = ?').get('c-active');
    assert.equal(bannedRow.isBanned, 1);
    assert.equal(bannedRow.banReason, 'Repeated order disputes and abusive language');

    // Attempting to edit note on already banned account must throw immutable error
    assert.throws(
      () => banCustomer('c-active', 'Attempt to change the ban note'),
      /The ban note cannot be modified after an account has been banned/
    );

    // Verify ban reason remains unchanged
    const unchangedRow = db.prepare('SELECT banReason FROM Customer WHERE id = ?').get('c-active');
    assert.equal(unchangedRow.banReason, 'Repeated order disputes and abusive language');
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('customer account LTV, last purchased, and activity tracking calculate correctly', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-ltv-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    execFileSync(
      process.execPath,
      ['scripts/initialize-categories.cjs'],
      { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' }
    );

    const now = new Date();
    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // Create 2 customers
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, state, pincode, lastActiveAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('c-buyer', '9830098300', 'hash', 'Active Buyer', 'West Bengal', '700001', tenMinsAgo);
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, state, pincode, lastActiveAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('c-dormant', '9830098301', 'hash', 'Dormant User', 'West Bengal', '700002', twoDaysAgo);

    // Insert 2 paid orders for c-buyer and 1 pending order
    db.prepare(`INSERT INTO "Order" (id, orderNumber, receipt, checkoutTokenHash, requestHash, status, customerName, phone, address, pincode, itemsJson, subtotal, shipping, total, paymentMode, paidAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run('ord-1', 2001, 'SK-2001', 'hash-1', 'req-1', 'paid', 'Active Buyer', '+91 98300 98300', '12 Lake Rd', '700001', '[]', 100000, 4000, 104000, 'razorpay', '2026-11-10T10:00:00.000Z', '2026-11-10T09:55:00.000Z');

    db.prepare(`INSERT INTO "Order" (id, orderNumber, receipt, checkoutTokenHash, requestHash, status, customerName, phone, address, pincode, itemsJson, subtotal, shipping, total, paymentMode, paidAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run('ord-2', 2002, 'SK-2002', 'hash-2', 'req-2', 'paid', 'Active Buyer', '9830098300', '12 Lake Rd', '700001', '[]', 250000, 0, 250000, 'razorpay', '2026-11-15T14:30:00.000Z', '2026-11-15T14:25:00.000Z');

    db.prepare(`INSERT INTO "Order" (id, orderNumber, receipt, checkoutTokenHash, requestHash, status, customerName, phone, address, pincode, itemsJson, subtotal, shipping, total, paymentMode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .run('ord-3', 2003, 'SK-2003', 'hash-3', 'req-3', 'pending', 'Active Buyer', '9830098300', '12 Lake Rd', '700001', '[]', 50000, 4000, 54000, 'razorpay');

    // Query paid orders using normalizePhone (matching app logic)
    const allPaidOrders = db.prepare("SELECT total, phone, paidAt FROM \"Order\" WHERE status = 'paid'").all();
    const paidOrders = allPaidOrders.filter(o => normalizePhone(o.phone) === '9830098300');
    const ltvPaise = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const ltvRupees = ltvPaise / 100;
    assert.equal(ltvRupees, 3540.00); // 1040 + 2500
    assert.equal(paidOrders.length, 2);

    // Active status: 10 mins ago is < 30 mins -> Active Now
    const buyer = db.prepare("SELECT lastActiveAt FROM Customer WHERE id = 'c-buyer'").get();
    const diffMs = Date.now() - new Date(buyer.lastActiveAt).getTime();
    assert.ok(diffMs <= 30 * 60 * 1000, 'Buyer should be recognized as active now');
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('admin can edit customer account details (phone, address, etc.) and validation rejects invalid phone/collisions', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-edit-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    execFileSync(
      process.execPath,
      ['scripts/initialize-categories.cjs'],
      { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' }
    );

    // Create 2 customers
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, state, pincode, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('cust-1', '9830011111', 'hash1', 'Original Name', 'West Bengal', '700001');
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, state, pincode, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('cust-2', '9830022222', 'hash2', 'Second Customer', 'Odisha', '751001');

    // Simulate PATCH handler logic
    const updateCustomer = (id, updates) => {
      const customer = db.prepare('SELECT * FROM Customer WHERE id = ?').get(id);
      if (!customer) throw new Error('Customer not found');

      if (updates.phone !== undefined) {
        const cleanPhone = normalizePhone(String(updates.phone));
        if (!cleanPhone || !isValidPhone(cleanPhone)) throw new Error('Invalid phone number');
        if (cleanPhone !== customer.phone) {
          const conflict = db.prepare('SELECT id FROM Customer WHERE phone = ? AND id != ?').get(cleanPhone, id);
          if (conflict) throw new Error('Phone collision error');
          db.prepare('UPDATE Customer SET phone = ? WHERE id = ?').run(cleanPhone, id);
        }
      }

      if (updates.name !== undefined) db.prepare('UPDATE Customer SET name = ? WHERE id = ?').run(updates.name, id);
      if (updates.email !== undefined) db.prepare('UPDATE Customer SET email = ? WHERE id = ?').run(updates.email, id);
      if (updates.address !== undefined) db.prepare('UPDATE Customer SET address = ? WHERE id = ?').run(updates.address, id);
      if (updates.state !== undefined) db.prepare('UPDATE Customer SET state = ? WHERE id = ?').run(updates.state, id);
      if (updates.pincode !== undefined) db.prepare('UPDATE Customer SET pincode = ? WHERE id = ?').run(updates.pincode, id);

      return db.prepare('SELECT * FROM Customer WHERE id = ?').get(id);
    };

    // Successful update including phone and address
    const updated = updateCustomer('cust-1', {
      name: 'Updated Name',
      phone: '9830099999',
      address: 'Plot 45, Nayabasat, Midnapore',
      email: 'updated@example.com',
      state: 'West Bengal',
      pincode: '721253',
    });

    assert.equal(updated.name, 'Updated Name');
    assert.equal(updated.phone, '9830099999');
    assert.equal(updated.address, 'Plot 45, Nayabasat, Midnapore');
    assert.equal(updated.email, 'updated@example.com');
    assert.equal(updated.state, 'West Bengal');
    assert.equal(updated.pincode, '721253');

    // Reject collision: trying to set cust-1 phone to cust-2 phone
    assert.throws(
      () => updateCustomer('cust-1', { phone: '9830022222' }),
      /Phone collision error/
    );

    // Reject invalid phone format
    assert.throws(
      () => updateCustomer('cust-1', { phone: '12345' }),
      /Invalid phone number/
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('admin can delete customer account and historical orders remain intact', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sabujkuthi-del-'));
  const filename = path.join(dir, 'test.db');
  const db = new Database(filename);
  try {
    db.exec('CREATE TABLE Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    execFileSync(
      process.execPath,
      ['scripts/initialize-categories.cjs'],
      { env: { ...process.env, DATABASE_URL: `file:${filename}` }, stdio: 'pipe' }
    );

    // Create a customer
    db.prepare('INSERT INTO Customer (id, phone, passwordHash, name, address, state, pincode, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run('c-delete-me', '9830055555', 'hash', 'To Delete', 'Old Address', 'West Bengal', '700001');

    // Place an order for this customer
    db.prepare(`INSERT INTO "Order" (id, orderNumber, receipt, checkoutTokenHash, requestHash, status, customerName, phone, address, pincode, itemsJson, subtotal, shipping, total, paymentMode, paidAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run('ord-del-test', 3001, 'SK-3001', 'token-hash', 'req-hash', 'paid', 'To Delete', '9830055555', 'Old Address', '700001', '[]', 100000, 4000, 104000, 'razorpay', '2026-11-10T10:00:00.000Z', '2026-11-10T09:55:00.000Z');

    // Admin deletes customer account
    const deleteResult = db.prepare('DELETE FROM Customer WHERE id = ?').run('c-delete-me');
    assert.equal(deleteResult.changes, 1);

    // Customer record is gone
    const customer = db.prepare('SELECT * FROM Customer WHERE id = ?').get('c-delete-me');
    assert.equal(customer, undefined);

    // Historical order is still intact
    const order = db.prepare('SELECT * FROM "Order" WHERE id = ?').get('ord-del-test');
    assert.ok(order);
    assert.equal(order.receipt, 'SK-3001');
    assert.equal(order.phone, '9830055555');
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
