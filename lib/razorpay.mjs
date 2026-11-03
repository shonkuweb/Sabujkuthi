import { CheckoutError } from './payment-core.mjs';
export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret || !/^rzp_(test|live)_/.test(keyId)) throw new CheckoutError('Payment service is not configured. Please contact the nursery.', 503);
  return { keyId, secret, mode: keyId.startsWith('rzp_test_') ? 'test' : 'live' };
}
async function request(path, data) {
  const { keyId, secret } = razorpayConfig();
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method: data ? 'POST' : 'GET',
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
  } catch { throw new CheckoutError('The payment service could not be reached. Please try again.', 502); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Razorpay request failed', { status: response.status, code: result.error?.code });
    throw new CheckoutError(response.status === 401 ? 'Payment credentials were rejected. Please contact the nursery.' : 'The payment service could not complete this request. Please try again.', 502);
  }
  return result;
}
export const gateway = {
  createOrder: data => request('/orders', data),
  fetchPayment: id => request(`/payments/${encodeURIComponent(id)}`),
  capturePayment: (id, amount, currency) => request(`/payments/${encodeURIComponent(id)}/capture`, { amount, currency }),
  orderPayments: id => request(`/orders/${encodeURIComponent(id)}/payments`),
};
