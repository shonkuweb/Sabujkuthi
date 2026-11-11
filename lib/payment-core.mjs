import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { deliveryPaise } from './shipping.mjs';
import { isProductDeliverableToLocation } from './indian-regions.mjs';
import { calculateDiscount } from './discounts.mjs';
export class CheckoutError extends Error {
  constructor(message, status = 400, code) { super(message); this.status = status; this.code = code; }
}
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export function validSignature(message, supplied, secret) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(supplied || '')) return false;
  const expected = createHmac('sha256', secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(supplied, 'hex'));
}
export function paise(value) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new CheckoutError('A product has an invalid price. Please contact the nursery.');
  const [rupees, decimals = ''] = text.split('.');
  const amount = Number(rupees) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) throw new CheckoutError('Invalid product price.');
  return amount;
}
export function prepareCheckout(input, products, shippingConfig = {}, discountConfig = null) {
  const customer = input?.customer;
  if (!customer || typeof customer !== 'object') throw new CheckoutError('Enter your delivery details.');
  const text = (value, min, max, label) => {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new CheckoutError(`Enter a valid ${label}.`);
    return value.trim();
  };
  const details = {
    customerName: text(customer.name, 2, 100, 'name'),
    phone: text(customer.phone, 10, 16, 'phone number').replace(/[\s()-]/g, ''),
    address: text(customer.address, 10, 1000, 'delivery address'),
    pincode: text(customer.pincode, 6, 6, 'pincode'),
    email: customer.email ? text(customer.email, 3, 254, 'email address') : null,
  };
  if (!/^(?:\+?91)?[6-9]\d{9}$/.test(details.phone)) throw new CheckoutError('Enter a valid Indian mobile number.');
  if (!/^[1-9]\d{5}$/.test(details.pincode)) throw new CheckoutError('Enter a valid six-digit pincode.');
  if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) throw new CheckoutError('Enter a valid email address.');
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 40) throw new CheckoutError('Your cart must contain between 1 and 40 items.');
  const snapshots = new Map();
  for (const item of input.items) {
    if (!item || typeof item.slug !== 'string' || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99 || (item.variant != null && typeof item.variant !== 'string')) throw new CheckoutError('Invalid cart quantity or option.');
    const product = products.find(product => product.slug === item.slug);
    if (!product || !product.isPublished || !product.inStock || !product.category?.isVisible) throw new CheckoutError('A product in your cart is no longer available. Refresh your cart.');
    const check = isProductDeliverableToLocation(product, details.pincode);
    if (!check.deliverable) {
      if (check.scope === 'states') {
        throw new CheckoutError(`${product.title} is not available for delivery in your region (only available in ${product.deliveryStates}).`);
      }
      throw new CheckoutError(`${product.title} is not available for delivery to this pincode.`);
    }
    let options = {};
    try { options = typeof product.adeniumOptions === 'string' ? JSON.parse(product.adeniumOptions || '{}') : product.adeniumOptions || {}; } catch { throw new CheckoutError('This product’s options could not be loaded.'); }
    const variants = Object.keys(options).filter(key => options[key] != null && options[key] !== '');
    const variant = item.variant || null;
    if ((variants.length && !variants.includes(variant)) || (!variants.length && variant)) throw new CheckoutError(`Choose a valid option for ${product.title}.`);
    const unitAmount = paise(variant ? options[variant] : product.price);
    const key = JSON.stringify([product.slug, variant]);
    const existing = snapshots.get(key);
    const qty = (existing?.qty || 0) + item.qty;
    if (qty > 99) throw new CheckoutError('The maximum quantity per product option is 99.');
    snapshots.set(key, { productId: product.id, slug: product.slug, title: product.title, variant, qty, unitAmount });
  }
  const items = [...snapshots.values()].sort((a, b) => JSON.stringify([a.slug, a.variant]).localeCompare(JSON.stringify([b.slug, b.variant])));
  const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.qty, 0);
  let discount = 0;
  if (discountConfig && discountConfig.enabled) {
    const subtotalRupees = Math.floor(subtotal / 100);
    const discountRupees = calculateDiscount(subtotalRupees, discountConfig);
    discount = discountRupees * 100;
  }
  const shipping = deliveryPaise(subtotal, shippingConfig);
  const total = Math.max(100, subtotal - discount + shipping);
  if (!Number.isSafeInteger(total) || total < 100 || total > 1000000000) throw new CheckoutError('Order total must be between ₹1 and ₹1,00,00,000.');
  const requestHash = hashToken(JSON.stringify({ details, items, subtotal, discount, shipping, total }));
  return { ...details, itemsJson: JSON.stringify(items), subtotal, discount, shipping, total, requestHash };
}
export async function completePayment(order, paymentId, { gateway, markPaid }) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId || '')) throw new CheckoutError('Invalid payment reference.');
  if (order.status === 'paid') {
    if (order.razorpayPaymentId !== paymentId) throw new CheckoutError('This order has a different confirmed payment.', 409);
    return order;
  }
  if (order.status !== 'pending' || !order.razorpayOrderId) throw new CheckoutError('This checkout cannot be confirmed.', 409);
  const matches = payment => {
    if (payment?.id !== paymentId || payment.order_id !== order.razorpayOrderId || payment.amount !== order.total || payment.currency !== order.currency) throw new CheckoutError('Payment details do not match this order.', 409);
  };
  let payment = await gateway.fetchPayment(paymentId);
  matches(payment);
  if (payment.status === 'authorized') {
    try { payment = await gateway.capturePayment(paymentId, order.total, order.currency); }
    catch (error) {
      // A webhook or another confirmation may have captured the same payment.
      const refreshed = await gateway.fetchPayment(paymentId);
      matches(refreshed);
      if (refreshed.status !== 'captured' || refreshed.captured !== true) throw error;
      payment = refreshed;
    }
    matches(payment);
  }
  if (payment.status !== 'captured' || payment.captured !== true) throw new CheckoutError('Payment is not captured yet. Please wait for confirmation.', 202);
  return markPaid(order.id, payment.id);
}
