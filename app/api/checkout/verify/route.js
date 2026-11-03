import { confirmPayment, customerOrder, ownedOrder } from '../../../../lib/payment-orders';
import { CheckoutError, validSignature } from '../../../../lib/payment-core.mjs';
import { razorpayConfig } from '../../../../lib/razorpay.mjs';
import { checkoutBody, checkoutError, checkoutResponse, rateLimit } from '../../../../lib/checkout-http';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    const data = await checkoutBody(request);
    const order = await ownedOrder(data.orderId, data.token);
    rateLimit(`verify:${order.id}`, 60);
    if (data.razorpay_order_id !== order.razorpayOrderId || !validSignature(`${order.razorpayOrderId}|${data.razorpay_payment_id}`, data.razorpay_signature, razorpayConfig().secret)) throw new CheckoutError('Payment signature could not be verified.', 400);
    const paid = await confirmPayment(order, data.razorpay_payment_id);
    return checkoutResponse({ status: 'paid', order: customerOrder(paid) });
  } catch (error) { return checkoutError(error); }
}
