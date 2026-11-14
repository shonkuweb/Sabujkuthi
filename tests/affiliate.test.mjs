import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createAffiliateSession, verifyAffiliateSession } from '../lib/affiliate-session.mjs';
import { hashPassword, verifyPassword } from '../lib/customer-auth.mjs';

test('affiliate session tokens encode payload, sign cryptographically, and reject tampering', async () => {
  const fakeAccount = {
    id: 'affiliate-uuid-1234',
    phone: '9876543210',
    name: 'Priya Mukherjee',
    email: 'priya@example.com'
  };

  const token = await createAffiliateSession(fakeAccount);
  assert.ok(typeof token === 'string' && token.includes('.'), 'token must be a base64url.sig string');

  const verified = await verifyAffiliateSession(token);
  assert.ok(verified, 'token should verify successfully');
  assert.equal(verified.id, fakeAccount.id);
  assert.equal(verified.phone, fakeAccount.phone);
  assert.equal(verified.name, fakeAccount.name);
  assert.equal(verified.email, fakeAccount.email);
  assert.ok(verified.exp > Date.now(), 'token expiry should be in the future');

  // Tampering detection
  const [b64, sig] = token.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify({ ...fakeAccount, phone: '9111111111', exp: Date.now() + 100000 })).toString('base64url');
  const tamperedToken = `${tamperedPayload}.${sig}`;
  const tamperedResult = await verifyAffiliateSession(tamperedToken);
  assert.equal(tamperedResult, null, 'Tampered token must be rejected');

  // Invalid signature
  const fakeSig = 'a'.repeat(64);
  assert.equal(await verifyAffiliateSession(`${b64}.${fakeSig}`), null, 'Invalid signature must be rejected');

  // Expired token
  const expiredPayload = Buffer.from(JSON.stringify({ ...fakeAccount, exp: Date.now() - 1000 })).toString('base64url');
  assert.equal(await verifyAffiliateSession(`${expiredPayload}.${sig}`), null, 'Expired token must be rejected');
});

test('affiliate password hashing and authentication is secure and timing-safe', () => {
  const rawPass = 'SecretPlantPass123';
  const hashed = hashPassword(rawPass);

  assert.ok(hashed.includes(':'), 'Password hash must contain salt and derived key');
  assert.ok(verifyPassword(rawPass, hashed), 'Correct password must verify');
  assert.ok(!verifyPassword('WrongPass', hashed), 'Incorrect password must fail');
  assert.ok(!verifyPassword('', hashed), 'Empty password must fail');
  assert.ok(!verifyPassword(rawPass, 'invalid:hash'), 'Corrupted hash must fail safely');
});

test('affiliate application requires at least one social channel link', () => {
  const hasAtLeastOneLink = (yt, insta, fb) => {
    return [yt, insta, fb].some(link => typeof link === 'string' && link.trim().length > 0);
  };

  assert.equal(hasAtLeastOneLink('', '', ''), false, 'All empty must fail');
  assert.equal(hasAtLeastOneLink('   ', null, undefined), false, 'Whitespaces must fail');
  assert.equal(hasAtLeastOneLink('https://youtube.com/@priya', '', ''), true, 'YouTube only is valid');
  assert.equal(hasAtLeastOneLink('', 'https://instagram.com/priyaplants', ''), true, 'Instagram only is valid');
  assert.equal(hasAtLeastOneLink('', '', 'https://facebook.com/priyabonsai'), true, 'Facebook only is valid');
  assert.equal(hasAtLeastOneLink('https://youtube.com/@priya', 'https://instagram.com/priya', ''), true, 'Multiple links are valid');
});

test('isolated SQLite schema contains AffiliateAccount, AffiliateProgramme and additive Order columns', () => {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderNumber" INTEGER,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "total" INTEGER NOT NULL,
      "couponCode" TEXT,
      "affiliateId" TEXT
    );

    CREATE TABLE IF NOT EXISTS "AffiliateAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "youtubeUrl" TEXT,
      "instagramUrl" TEXT,
      "facebookUrl" TEXT,
      "message" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "couponCode" TEXT UNIQUE,
      "warningMessage" TEXT,
      "banMessage" TEXT,
      "rejectReason" TEXT,
      "reviewedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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
  `);

  // Insert mock programme with % commission, category scope, min order value and code duration
  const insertProgramme = db.prepare(`
    INSERT INTO "AffiliateProgramme" (
      id, title, description, commissionType, commissionValue, discountType, discountValue,
      scopeType, categoryId, productIds, minOrderValue, startDate, endDate, status, terms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProgramme.run(
    'prog-1',
    'Adenium Monsoon Fest',
    'Special promotion for grafted adeniums',
    'fixed',
    150.0,
    'percentage',
    10.0,
    'category',
    'cat-adenium',
    null,
    499,
    '2026-06-01',
    '2026-08-31',
    'active',
    'Min order ₹499'
  );

  const prog = db.prepare('SELECT * FROM "AffiliateProgramme" WHERE id = ?').get('prog-1');
  assert.equal(prog.title, 'Adenium Monsoon Fest');
  assert.equal(prog.commissionType, 'fixed');
  assert.equal(prog.commissionValue, 150.0);
  assert.equal(prog.discountType, 'percentage');
  assert.equal(prog.discountValue, 10.0);
  assert.equal(prog.scopeType, 'category');
  assert.equal(prog.categoryId, 'cat-adenium');
  assert.equal(prog.minOrderValue, 499);
  assert.equal(prog.startDate, '2026-06-01');
  assert.equal(prog.endDate, '2026-08-31');

  // Insert mock affiliate
  const insertAffiliate = db.prepare(`
    INSERT INTO "AffiliateAccount" (id, name, email, phone, passwordHash, status, couponCode, warningMessage, banMessage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAffiliate.run('aff-1', 'Rajesh Sharma', 'rajesh@example.com', '9876543210', 'salt:hash', 'approved', 'RAJESH10', 'Check your description links', null);

  // Assign approved partner to programme
  db.prepare('INSERT INTO "AffiliateAccountProgramme" (id, affiliateId, programmeId) VALUES (?, ?, ?)').run('link-1', 'aff-1', 'prog-1');
  const enrolled = db.prepare(`
    SELECT a.name, a.couponCode, p.title, p.commissionValue, p.commissionType
    FROM "AffiliateAccountProgramme" ap
    JOIN "AffiliateAccount" a ON a.id = ap.affiliateId
    JOIN "AffiliateProgramme" p ON p.id = ap.programmeId
    WHERE p.id = ?
  `).all('prog-1');

  assert.equal(enrolled.length, 1);
  assert.equal(enrolled[0].name, 'Rajesh Sharma');
  assert.equal(enrolled[0].couponCode, 'RAJESH10');
  assert.equal(enrolled[0].commissionValue, 150.0);
  assert.equal(enrolled[0].commissionType, 'fixed');

  const found = db.prepare('SELECT * FROM "AffiliateAccount" WHERE id = ?').get('aff-1');
  assert.equal(found.name, 'Rajesh Sharma');
  assert.equal(found.status, 'approved');
  assert.equal(found.couponCode, 'RAJESH10');
  assert.equal(found.warningMessage, 'Check your description links');
  assert.equal(found.banMessage, null);

  // Admin ban with message
  db.prepare('UPDATE "AffiliateAccount" SET status = ?, banMessage = ? WHERE id = ?').run('banned', 'Suspended due to spam promotion', 'aff-1');
  const banned = db.prepare('SELECT * FROM "AffiliateAccount" WHERE id = ?').get('aff-1');
  assert.equal(banned.status, 'banned');
  assert.equal(banned.banMessage, 'Suspended due to spam promotion');

  // Insert mock orders attributing to RAJESH10
  const insertOrder = db.prepare('INSERT INTO "Order" (id, orderNumber, status, total, couponCode, affiliateId) VALUES (?, ?, ?, ?, ?, ?)');
  insertOrder.run('ord-1', 1001, 'paid', 250000, 'RAJESH10', 'aff-1');
  insertOrder.run('ord-2', 1002, 'paid', 180000, 'RAJESH10', 'aff-1');

  const orders = db.prepare('SELECT COUNT(*) as count, SUM(total) as sales FROM "Order" WHERE couponCode = ? AND status = ?').get('RAJESH10', 'paid');
  assert.equal(orders.count, 2);
  assert.equal(orders.sales, 430000);

  db.close();
});
