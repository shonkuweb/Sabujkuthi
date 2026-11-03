import { NextResponse } from 'next/server';
import { CheckoutError } from './payment-core.mjs';
const limits = new Map();
export function rateLimit(key, maximum = 20) {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || entry.expires < now) limits.set(key, { count: 1, expires: now + 600000 });
  else if (++entry.count > maximum) throw new CheckoutError('Too many checkout requests. Please wait a few minutes and try again.', 429);
  if (limits.size > 5000) for (const [key, item] of limits) if (item.expires < now) limits.delete(key);
}
export async function boundedBody(request, maximum) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new CheckoutError('Request is too large.', 413); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function checkoutBody(request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host')) throw new CheckoutError('Invalid checkout origin.', 403);
  const body = (await boundedBody(request, 65536)).toString('utf8');
  let parsed;
  try { parsed = JSON.parse(body); } catch { throw new CheckoutError('Invalid checkout request.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new CheckoutError('Invalid checkout request.');
  return parsed;
}
export function checkoutResponse(data, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function checkoutError(error) {
  if (error instanceof CheckoutError) return checkoutResponse({ error: error.message, ...(error.code ? { code: error.code } : {}), ...(error.status === 202 ? { status: 'pending' } : {}) }, error.status);
  console.error('Checkout error', { name: error.name, code: error.code });
  return checkoutResponse({ error: 'Checkout could not be completed. Please try again.' }, 500);
}
