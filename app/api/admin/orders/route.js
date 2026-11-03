import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';
import { checkoutResponse } from '../../../../lib/checkout-http';
import { orderReference } from '../../../../lib/order-reference.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  if (!await isAdminRequest(request)) return checkoutResponse({ error: 'Please sign in again to view orders.' }, 401);
  try {
    const orders = await prisma.order.findMany({ where: { status: 'paid' }, orderBy: { paidAt: 'desc' }, select: {
      id: true, orderNumber: true, receipt: true, razorpayOrderId: true, razorpayPaymentId: true, status: true,
      fulfillmentStatus: true, customerName: true, phone: true, email: true, address: true, pincode: true,
      itemsJson: true, subtotal: true, shipping: true, total: true, currency: true, paymentMode: true, paidAt: true, createdAt: true,
    } });
    return checkoutResponse(orders.map(({ itemsJson, ...order }) => ({ ...order, receipt: orderReference(order), items: JSON.parse(itemsJson) })));
  } catch { return checkoutResponse({ error: 'Unable to load paid orders.' }, 500); }
}
