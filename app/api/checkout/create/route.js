import { createCheckout } from '../../../../lib/payment-orders';
import { checkoutBody, checkoutError, checkoutResponse, rateLimit } from '../../../../lib/checkout-http';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    rateLimit(`create:${request.headers.get('x-forwarded-for')?.split(',')[0] || 'local'}`);
    return checkoutResponse(await createCheckout(await checkoutBody(request)));
  } catch (error) { return checkoutError(error); }
}
