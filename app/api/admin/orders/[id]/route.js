import { prisma } from '../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../lib/admin-session.mjs';
import { orderStages } from '../../../../../lib/order-status.mjs';
import { checkoutBody, checkoutError, checkoutResponse } from '../../../../../lib/checkout-http';
export async function PATCH(request, { params }) {
  if (!await isAdminRequest(request)) return checkoutResponse({ error: 'Please sign in again to update orders.' }, 401);
  try {
    const { id } = await params;
    const { fulfillmentStatus } = await checkoutBody(request);
    if (!orderStages.some(stage => stage.key === fulfillmentStatus)) return checkoutResponse({ error: 'Choose a valid fulfilment stage.' }, 400);
    const result = await prisma.order.updateMany({ where: { id, status: 'paid' }, data: { fulfillmentStatus } });
    if (!result.count) return checkoutResponse({ error: 'Paid order not found.' }, 404);
    return checkoutResponse({ fulfillmentStatus });
  } catch (error) { return checkoutError(error); }
}
