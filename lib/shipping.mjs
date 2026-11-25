export const DEFAULT_FREE_DELIVERY_THRESHOLD = 3999;
export const DEFAULT_DELIVERY_CHARGE = 40;
export const DEFAULT_DTDC_CHARGE = 40;
export const DEFAULT_BLUEDART_CHARGE = 90;
export const FREE_DELIVERY_THRESHOLD = DEFAULT_FREE_DELIVERY_THRESHOLD;
export const DELIVERY_CHARGE = DEFAULT_DELIVERY_CHARGE;

export const COURIER_OPTIONS = {
  dtdc: {
    id: 'dtdc',
    name: 'DTDC Standard',
    tagline: 'Economical delivery · Condition is good',
    estimatedDays: '5–8 business days',
    defaultCharge: DEFAULT_DTDC_CHARGE,
  },
  bluedart: {
    id: 'bluedart',
    name: 'Blue Dart Express',
    tagline: 'Fast delivery & superior plant care quality',
    estimatedDays: '2–4 business days',
    defaultCharge: DEFAULT_BLUEDART_CHARGE,
  },
};

export function deliveryPaise(subtotal, config = {}, courier = 'dtdc') {
  if (subtotal === 0) return 0;
  const threshold = typeof config?.freeDeliveryThreshold === 'number' && config.freeDeliveryThreshold >= 0
    ? config.freeDeliveryThreshold
    : FREE_DELIVERY_THRESHOLD;

  const isFreeStandard = threshold === 0 || subtotal >= threshold * 100;

  const dtdcCharge = typeof config?.dtdcCharge === 'number' && config.dtdcCharge >= 0
    ? config.dtdcCharge
    : (typeof config?.deliveryCharge === 'number' && config.deliveryCharge >= 0 ? config.deliveryCharge : DEFAULT_DTDC_CHARGE);

  const bluedartCharge = typeof config?.bluedartCharge === 'number' && config.bluedartCharge >= 0
    ? config.bluedartCharge
    : DEFAULT_BLUEDART_CHARGE;

  const selectedCourier = courier === 'bluedart' ? 'bluedart' : 'dtdc';

  if (selectedCourier === 'dtdc') {
    return isFreeStandard ? 0 : Math.round(dtdcCharge * 100);
  } else {
    // Blue dart express:
    // If order reaches free delivery threshold, the customer gets the standard delivery discount (free standard),
    // and only pays the express difference (bluedartCharge - dtdcCharge).
    // If bluedartCharge <= dtdcCharge, it's 0 (FREE).
    // If order does not reach threshold, customer pays full bluedartCharge.
    if (isFreeStandard) {
      const upgrade = Math.max(0, bluedartCharge - dtdcCharge);
      return Math.round(upgrade * 100);
    }
    return Math.round(bluedartCharge * 100);
  }
}
