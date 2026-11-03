import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { completePayment, paise, prepareCheckout, validSignature } from '../lib/payment-core.mjs';
import { deliveryPaise } from '../lib/shipping.mjs';
import { createAdminSession, verifyAdminSession } from '../lib/admin-session.mjs';

const product = { id: 'p1', slug: 'plant', title: 'Plant', price: '99.99', inStock: true, isPublished: true, category: { isVisible: true } };
const customer = { name: 'Test Customer', phone: '9999999999', address: '10 Test Road, Test City', pincode: '721152' };
const input = { customer, items: [{ slug: 'plant', qty: 2, price: '0.01' }], total: 1 };
const order = { id: 'local-order', razorpayOrderId: 'order_gateway', total: 23998, currency: 'INR', status: 'pending' };
const payment = { id: 'pay_gateway', order_id: order.razorpayOrderId, amount: order.total, currency: 'INR', status: 'captured', captured: true };

test('money is handled as integer paise and shipping switches exactly at ₹3999', () => {
  assert.equal(paise('99.99'), 9999); assert.equal(paise('0.10'), 10);
  assert.equal(deliveryPaise(399899), 4000); assert.equal(deliveryPaise(399900), 0);
  assert.throws(() => paise('-1')); assert.throws(() => paise('9.999'));
});
test('client-provided prices and totals cannot change the database quote', () => {
  const quote = prepareCheckout(input, [product]);
  assert.equal(quote.subtotal, 19998); assert.equal(quote.shipping, 4000); assert.equal(quote.total, 23998);
  assert.equal(JSON.parse(quote.itemsJson)[0].unitAmount, 9999);
});
test('duplicate cart lines are merged and combined quantity is limited', () => {
  const quote = prepareCheckout({ ...input, items: [...input.items, ...input.items] }, [product]);
  assert.equal(JSON.parse(quote.itemsJson)[0].qty, 4);
  assert.throws(() => prepareCheckout({ ...input, items: [{ slug: 'plant', qty: 60 }, { slug: 'plant', qty: 60 }] }, [product]));
});
test('unpublished, hidden and sold-out products are rejected', () => {
  for (const changed of [{ isPublished: false }, { inStock: false }, { category: { isVisible: false } }]) assert.throws(() => prepareCheckout(input, [{ ...product, ...changed }]));
  assert.throws(() => prepareCheckout(input, []));
});
test('invalid quantities, customer data and unsupported delivery addresses are rejected', () => {
  for (const qty of [0, -1, 0.5, 100, '2']) assert.throws(() => prepareCheckout({ ...input, items: [{ slug: 'plant', qty }] }, [product]));
  assert.throws(() => prepareCheckout({ ...input, customer: { ...customer, phone: '123' } }, [product]));
  assert.throws(() => prepareCheckout(input, [{ ...product, deliveryPincodes: '700001' }]));
});
test('variant prices come from database options and invalid selections are rejected', () => {
  const variant = { ...product, adeniumOptions: JSON.stringify({ Large: '149.50' }) };
  assert.throws(() => prepareCheckout(input, [variant]));
  const quote = prepareCheckout({ ...input, items: [{ slug: 'plant', qty: 1, variant: 'Large' }] }, [variant]);
  assert.equal(quote.subtotal, 14950);
  assert.throws(() => prepareCheckout({ ...input, items: [{ slug: 'plant', qty: 1, variant: 'Fake' }] }, [variant]));
});
test('payment and webhook signatures reject tampering and malformed signatures', () => {
  const secret = 'test-secret'; const body = 'order_gateway|pay_gateway';
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(validSignature(body, signature, secret), true);
  assert.equal(validSignature(body + 'x', signature, secret), false);
  assert.equal(validSignature(body, 'bad', secret), false);
  assert.equal(validSignature(body, signature, 'wrong'), false);
});
test('only matching, captured payments can mark an order paid', async () => {
  let writes = 0;
  const result = await completePayment(order, payment.id, { gateway: { fetchPayment: async () => payment }, markPaid: async () => { writes++; return { ...order, status: 'paid' }; } });
  assert.equal(result.status, 'paid'); assert.equal(writes, 1);
});
test('wrong order, amount, currency or payment id never writes a paid order', async () => {
  for (const changed of [{ order_id: 'order_other' }, { amount: 1 }, { currency: 'USD' }, { id: 'pay_other' }]) {
    let writes = 0;
    await assert.rejects(completePayment(order, payment.id, { gateway: { fetchPayment: async () => ({ ...payment, ...changed }) }, markPaid: async () => { writes++; } }));
    assert.equal(writes, 0);
  }
});
test('failed and uncaptured payments remain unpaid', async () => {
  for (const status of ['created', 'failed', 'refunded']) {
    let writes = 0;
    await assert.rejects(completePayment(order, payment.id, { gateway: { fetchPayment: async () => ({ ...payment, status, captured: false }) }, markPaid: async () => { writes++; } }));
    assert.equal(writes, 0);
  }
});
test('authorized payments are captured using the stored amount before confirming', async () => {
  let capturedArgs;
  const result = await completePayment(order, payment.id, {
    gateway: { fetchPayment: async () => ({ ...payment, status: 'authorized', captured: false }), capturePayment: async (...args) => { capturedArgs = args; return payment; } },
    markPaid: async () => ({ ...order, status: 'paid' }),
  });
  assert.equal(result.status, 'paid'); assert.deepEqual(capturedArgs, [payment.id, order.total, 'INR']);
});
test('capture failures never mark an order paid', async () => {
  let writes = 0;
  await assert.rejects(completePayment(order, payment.id, { gateway: { fetchPayment: async () => ({ ...payment, status: 'authorized' }), capturePayment: async () => { throw new Error('Capture failed'); } }, markPaid: async () => { writes++; } }));
  assert.equal(writes, 0);
});
test('repeated confirmation of the same payment is idempotent', async () => {
  const paid = { ...order, status: 'paid', razorpayPaymentId: payment.id };
  assert.equal(await completePayment(paid, payment.id, { gateway: {}, markPaid: () => { throw new Error('Duplicate write'); } }), paid);
  await assert.rejects(completePayment(paid, 'pay_other', { gateway: {}, markPaid: () => {} }));
});
test('admin sessions cannot be forged by setting a plain authenticated cookie', async () => {
  process.env.ADMIN_SESSION_SECRET = 'isolated-test-session-secret';
  assert.equal(await verifyAdminSession('authenticated'), false);
  const token = await createAdminSession(); assert.equal(await verifyAdminSession(token), true);
  assert.equal(await verifyAdminSession(`${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`), false);
  const expired = String(Date.now() - 1000);
  assert.equal(await verifyAdminSession(`${expired}.${createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(expired).digest('hex')}`), false);
});
test('a concurrent capture is recovered without duplicating an order', async () => {
  let reads = 0, writes = 0;
  const result = await completePayment(order, payment.id, {
    gateway: { fetchPayment: async () => ++reads === 1 ? { ...payment, status: 'authorized', captured: false } : payment, capturePayment: async () => { throw new Error('Already captured'); } },
    markPaid: async () => { writes++; return { ...order, status: 'paid' }; },
  });
  assert.equal(result.status, 'paid'); assert.equal(writes, 1); assert.equal(reads, 2);
});
