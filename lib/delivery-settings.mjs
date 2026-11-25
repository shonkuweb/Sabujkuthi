import {
  DEFAULT_DELIVERY_CHARGE,
  DEFAULT_FREE_DELIVERY_THRESHOLD,
  DEFAULT_DTDC_CHARGE,
  DEFAULT_BLUEDART_CHARGE,
} from './shipping.mjs';

export const DELIVERY_SETTINGS_KEY = 'store_delivery_settings';

export const defaultDeliverySettings = {
  deliveryCharge: DEFAULT_DELIVERY_CHARGE,
  freeDeliveryThreshold: DEFAULT_FREE_DELIVERY_THRESHOLD,
  dtdcCharge: DEFAULT_DTDC_CHARGE,
  bluedartCharge: DEFAULT_BLUEDART_CHARGE,
};

export function validateDeliverySettings(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid delivery settings.');
  const charge = Number(input.deliveryCharge ?? input.dtdcCharge ?? DEFAULT_DELIVERY_CHARGE);
  if (!Number.isFinite(charge) || charge < 0 || charge > 100000) {
    throw new Error('Delivery charge must be a valid amount between ₹0 and ₹1,00,000.');
  }
  const threshold = Number(input.freeDeliveryThreshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 10000000) {
    throw new Error('Free delivery minimum order must be a valid amount between ₹0 and ₹1,00,00,000.');
  }

  const dtdc = Number(input.dtdcCharge ?? charge);
  if (!Number.isFinite(dtdc) || dtdc < 0 || dtdc > 100000) {
    throw new Error('DTDC delivery charge must be a valid amount between ₹0 and ₹1,00,000.');
  }

  const bluedart = Number(input.bluedartCharge ?? DEFAULT_BLUEDART_CHARGE);
  if (!Number.isFinite(bluedart) || bluedart < 0 || bluedart > 100000) {
    throw new Error('Blue Dart delivery charge must be a valid amount between ₹0 and ₹1,00,000.');
  }

  const result = {
    deliveryCharge: Math.round(charge),
    freeDeliveryThreshold: Math.round(threshold),
  };
  if (input.dtdcCharge !== undefined || input.bluedartCharge !== undefined) {
    result.dtdcCharge = Math.round(dtdc);
    result.bluedartCharge = Math.round(bluedart);
  }
  return result;
}

export async function getStoredDeliverySettings(prismaClient) {
  try {
    const saved = await prismaClient.settings.findUnique({ where: { key: DELIVERY_SETTINGS_KEY } });
    if (saved?.value) {
      const parsed = JSON.parse(saved.value);
      const validated = validateDeliverySettings(parsed);
      return {
        ...defaultDeliverySettings,
        ...validated,
        dtdcCharge: validated.dtdcCharge ?? validated.deliveryCharge ?? defaultDeliverySettings.dtdcCharge,
        bluedartCharge: validated.bluedartCharge ?? defaultDeliverySettings.bluedartCharge,
      };
    }
  } catch {}
  return defaultDeliverySettings;
}
