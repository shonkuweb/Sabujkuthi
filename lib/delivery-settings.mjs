import { DEFAULT_DELIVERY_CHARGE, DEFAULT_FREE_DELIVERY_THRESHOLD } from './shipping.mjs';

export const DELIVERY_SETTINGS_KEY = 'store_delivery_settings';

export const defaultDeliverySettings = {
  deliveryCharge: DEFAULT_DELIVERY_CHARGE,
  freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
};

export function validateDeliverySettings(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid delivery settings.');
  const charge = Number(input.deliveryCharge);
  if (!Number.isFinite(charge) || charge < 0 || charge > 100000) {
    throw new Error('Delivery charge must be a valid amount between ₹0 and ₹1,00,000.');
  }
  const threshold = Number(input.freeDeliveryThreshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 10000000) {
    throw new Error('Free delivery minimum order must be a valid amount between ₹0 and ₹1,00,00,000.');
  }
  return {
    deliveryCharge: Math.round(charge),
    freeDeliveryThreshold: Math.round(threshold),
  };
}

export async function getStoredDeliverySettings(prismaClient) {
  try {
    const saved = await prismaClient.settings.findUnique({ where: { key: DELIVERY_SETTINGS_KEY } });
    if (saved?.value) {
      return validateDeliverySettings(JSON.parse(saved.value));
    }
  } catch {}
  return defaultDeliverySettings;
}
