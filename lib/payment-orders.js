import { randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { CheckoutError, completePayment, hashToken, prepareCheckout } from './payment-core.mjs';
import { gateway, razorpayConfig } from './razorpay.mjs';
import { orderReference } from './order-reference.mjs';
import { getStoredDeliverySettings } from './delivery-settings.mjs';

export function checkoutToken(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9-]{32,100}$/.test(value)) throw new CheckoutError('Invalid checkout session. Please start checkout again.');
  return hashToken(value);
}
export async function ownedOrder(id, token) {
  const tokenHash = checkoutToken(token);
  if (typeof id !== 'string') throw new CheckoutError('Invalid order reference.');
  const order = await prisma.order.findFirst({ where: { id, checkoutTokenHash: tokenHash } });
  if (!order) throw new CheckoutError('This order could not be found in your checkout session.', 404);
  return order;
}
export function customerOrder(order) {
  return {
    id: order.id, receipt: orderReference(order), status: order.status, subtotal: order.subtotal,
    shipping: order.shipping, total: order.total, currency: order.currency,
    paymentMode: order.paymentMode, paidAt: order.paidAt,
    items: JSON.parse(order.itemsJson),
  };
}
export async function confirmPayment(order, paymentId) {
  return completePayment(order, paymentId, {
    gateway,
    markPaid: async (id, razorpayPaymentId) => {
      await prisma.order.updateMany({ where: { id, status: 'pending', razorpayPaymentId: null }, data: { status: 'paid', razorpayPaymentId, paidAt: new Date() } });
      const confirmed = await prisma.order.findUnique({ where: { id } });
      if (confirmed?.status !== 'paid' || confirmed.razorpayPaymentId !== razorpayPaymentId) throw new CheckoutError('Payment confirmation could not be saved. Please contact the nursery.', 409);
      return confirmed;
    },
  });
}
export async function reconcileOrder(order) {
  if (order.status !== 'pending' || !order.razorpayOrderId) return order;
  const payments = await gateway.orderPayments(order.razorpayOrderId);
  const payment = payments.items?.find(item => ['captured', 'authorized'].includes(item.status));
  return payment ? confirmPayment(order, payment.id) : order;
}
export async function createCheckout(input) {
  const config = razorpayConfig();
  const tokenHash = checkoutToken(input?.token);
  const slugs = Array.isArray(input.items) ? input.items.filter(item => typeof item?.slug === 'string').map(item => item.slug) : [];
  const products = await prisma.product.findMany({ where: { slug: { in: slugs } }, include: { category: true } });
  const deliveryConfig = await getStoredDeliverySettings(prisma);
  const offersRecord = await prisma.settings.findUnique({ where: { key: 'offers_settings' } });
  let discountConfig = null;
  if (offersRecord?.value) {
    try {
      const parsed = JSON.parse(offersRecord.value);
      if (parsed.discountRule?.enabled) discountConfig = parsed.discountRule;
    } catch {}
  }
  const details = prepareCheckout(input, products, deliveryConfig, discountConfig);
  if (!Number.isSafeInteger(input.expectedTotal) || input.expectedTotal !== details.total) throw new CheckoutError("Your cart total has changed. Refresh the cart before paying.", 409);
  let order = await prisma.order.findUnique({ where: { checkoutTokenHash: tokenHash } });
  if (order) {
    if (order.requestHash !== details.requestHash) throw new CheckoutError('Your cart or delivery details changed. Please try checkout again.', 409, 'restart_checkout');
    if (order.status === 'paid') return { status: 'paid', order: customerOrder(order) };
    if (order.status !== 'pending') throw new CheckoutError('Please start a new checkout attempt.', 409, 'restart_checkout');
  } else {
    const id = randomUUID();
    const { discount: _ignoredDiscount, ...orderDbFields } = details;
    try {
      order = await prisma.$transaction(async tx => {
        // Increment inside the same write transaction: parallel checkouts cannot reuse a number.
        const [sequence] = await tx.$queryRaw`UPDATE Settings SET value = CAST(value AS INTEGER) + 1 WHERE key = 'order_number_sequence' RETURNING value`;
        const orderNumber = Number(sequence?.value);
        if (!Number.isSafeInteger(orderNumber) || orderNumber < 1001) throw new Error('Order sequence is not initialized.');
        return tx.order.create({ data: { id, orderNumber, receipt: `SK-${orderNumber}`, checkoutTokenHash: tokenHash, ...orderDbFields, paymentMode: config.mode } });
      });
    } catch (error) {
      if (error.code === 'P2002') throw new CheckoutError('Checkout is already being prepared. Please try again in a moment.', 409);
      throw error;
    }
    try {
      const external = await gateway.createOrder({ amount: order.total, currency: order.currency, receipt: order.receipt, notes: { store_order_id: order.id } });
      if (!/^order_[A-Za-z0-9]+$/.test(external.id || '') || external.amount !== order.total || external.currency !== order.currency) throw new CheckoutError('The payment service returned an invalid checkout.', 502);
      order = await prisma.order.update({ where: { id }, data: { razorpayOrderId: external.id } });
    } catch (error) {
      await prisma.order.updateMany({ where: { id, status: 'pending', razorpayOrderId: null }, data: { status: 'failed' } });
      throw error;
    }
  }
  if (!order.razorpayOrderId) throw new CheckoutError('Checkout is still being prepared. Please try again shortly.', 409);
  return {
    status: 'pending', orderId: order.id, receipt: orderReference(order),
    razorpayOrderId: order.razorpayOrderId, keyId: config.keyId, amount: order.total,
    currency: order.currency, paymentMode: order.paymentMode,
    summary: { subtotal: order.subtotal, shipping: order.shipping, total: order.total },
    customer: { name: order.customerName, contact: order.phone, email: order.email || undefined },
  };
}
