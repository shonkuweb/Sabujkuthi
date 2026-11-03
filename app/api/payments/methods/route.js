import { NextResponse } from 'next/server';
import { razorpayConfig } from '../../../../lib/razorpay.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
let cached;
let pending;
export async function GET() {
  try {
    const { keyId, mode } = razorpayConfig();
    if (cached?.keyId === keyId && cached.expires > Date.now()) return NextResponse.json(cached.methods);
    if (!pending || pending.keyId !== keyId) {
      const promise = (async () => {
        // Razorpay's methods endpoint uses Key-ID-only authentication.
        const response = await fetch(`https://api.razorpay.com/v1/methods?key_id=${encodeURIComponent(keyId)}`, {
          headers: { Authorization: `Basic ${Buffer.from(`${keyId}:`).toString('base64')}` },
          cache: 'no-store', signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error('Unable to load enabled payment methods');
        const data = await response.json();
        const networks = data.card_networks || {};
        const hasEnabled = value => value === true || (value && typeof value === 'object' && Object.values(value).some(item => item !== false && item !== 0 && item != null));
        const methods = {
          card: data.card === true, upi: data.upi === true,
          netbanking: !!hasEnabled(data.netbanking), wallet: !!hasEnabled(data.wallet),
          networks: { visa: !!networks.VISA, mastercard: !!networks.MC, rupay: !!networks.RUPAY, maestro: !!networks.MAES },
          testMode: mode === 'test',
        };
        cached = { keyId, methods, expires: Date.now() + 300000 };
        return methods;
      })();
      pending = { keyId, promise };
      promise.finally(() => { if (pending?.promise === promise) pending = null; }).catch(() => {});
    }
    return NextResponse.json(await pending.promise);
  } catch {
    return NextResponse.json({ error: 'Payment options are available in Razorpay checkout.' }, { status: 503 });
  }
}
