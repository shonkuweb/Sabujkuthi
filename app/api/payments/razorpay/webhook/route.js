import { prisma } from '../../../../../lib/prisma';
import { confirmPayment } from '../../../../../lib/payment-orders';
import { validSignature } from '../../../../../lib/payment-core.mjs';
import { boundedBody, checkoutError, checkoutResponse } from '../../../../../lib/checkout-http';
export const runtime = 'nodejs';
export async function POST(request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return checkoutResponse({ error: 'Webhook is not configured.' }, 503);
  try {
    const raw = await boundedBody(request, 1000000);
    if (!validSignature(raw, request.headers.get('x-razorpay-signature'), secret)) return checkoutResponse({ error: 'Invalid webhook signature.' }, 400);
    let event;
    try { event = JSON.parse(raw.toString('utf8')); } catch { return checkoutResponse({ error: 'Invalid webhook payload.' }, 400); }
    if (!['payment.captured', 'order.paid'].includes(event.event)) return checkoutResponse({ received: true });
    const payment = event.payload?.payment?.entity;
    if (!payment?.id || !payment?.order_id) return checkoutResponse({ error: 'Missing payment details.' }, 400);
    const order = await prisma.order.findUnique({ where: { razorpayOrderId: payment.order_id } });
    if (!order) return checkoutResponse({ error: 'Order not ready for confirmation. Please retry.' }, 503);
    await confirmPayment(order, payment.id);
    return checkoutResponse({ received: true });
  } catch (error) {
    if (error.status === 202) return checkoutResponse({ error: 'Payment capture is awaiting confirmation. Please retry.' }, 503);
    return checkoutError(error);
  }
}
