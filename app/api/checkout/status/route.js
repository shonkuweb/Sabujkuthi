import { customerOrder, ownedOrder, reconcileOrder } from '../../../../lib/payment-orders';
import { checkoutBody, checkoutError, checkoutResponse, rateLimit } from '../../../../lib/checkout-http';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    const data = await checkoutBody(request);
    let order = await ownedOrder(data.orderId, data.token);
    rateLimit(`status:${order.id}`, 100);
    order = await reconcileOrder(order);
    return checkoutResponse({ status: order.status, order: customerOrder(order) });
  } catch (error) { return checkoutError(error); }
}
