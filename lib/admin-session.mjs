const encoder = new TextEncoder();
async function signature(value) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function createAdminSession() {
  const expiry = String(Date.now() + 86400000);
  return `${expiry}.${await signature(expiry)}`;
}
export async function verifyAdminSession(token) {
  if (typeof token !== 'string') return false;
  const [expiry, supplied, extra] = token.split('.');
  if (extra || !/^\d{13}$/.test(expiry) || !/^[a-f0-9]{64}$/.test(supplied || '') || Number(expiry) <= Date.now() || Number(expiry) > Date.now() + 86400000) return false;
  try {
    const expected = await signature(expiry);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
    return difference === 0;
  } catch { return false; }
}
export async function isAdminRequest(request) { return verifyAdminSession(request.cookies.get('admin_token')?.value); }
