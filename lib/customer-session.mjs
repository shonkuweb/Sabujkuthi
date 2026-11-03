const encoder = new TextEncoder();

function getSecret() {
  return process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || 'sabujkuthi-customer-session-secret-2026';
}

async function signature(value) {
  const secret = getSecret();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createCustomerSession(customer) {
  const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = {
    id: customer.id,
    phone: customer.phone,
    name: customer.name || '',
    exp: expiry,
  };
  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const sig = await signature(base64Data);
  return `${base64Data}.${sig}`;
}

export async function verifyCustomerSession(token) {
  if (typeof token !== 'string') return null;
  const [b64Data, supplied, extra] = token.split('.');
  if (!b64Data || !supplied || extra || !/^[a-f0-9]{64}$/.test(supplied)) return null;

  try {
    const expected = await signature(b64Data);
    let difference = 0;
    if (expected.length !== supplied.length) return null;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
    if (difference !== 0) return null;

    const jsonStr = Buffer.from(b64Data, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr);
    if (!payload.id || !payload.phone || !payload.exp || Number(payload.exp) <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCustomerFromRequest(request) {
  const token = request.cookies.get('customer_token')?.value;
  return verifyCustomerSession(token);
}
