import crypto from 'node:crypto';

export function normalizePhone(phone) {
  if (typeof phone !== 'string') return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('91') && cleaned.length > 10) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  return cleaned.replace(/\D/g, '').trim();
}

export function isValidPhone(phone) {
  const normalized = normalizePhone(phone);
  // Valid Indian mobile number is 10 digits starting with 5-9
  return /^[5-9]\d{9}$/.test(normalized);
}

export function hashPassword(password) {
  if (typeof password !== 'string' || !password) throw new Error('Password is required');
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}
