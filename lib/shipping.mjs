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

/**
 * Derives the effective shipping configuration (DTDC and Blue Dart charges)
 * taking into account per-product custom courier rates and store defaults.
 */
export function getEffectiveShippingConfig(productsOrItems = [], baseConfig = {}, options = {}) {
  const storeDtdc = typeof baseConfig?.dtdcCharge === 'number' && baseConfig.dtdcCharge >= 0
    ? baseConfig.dtdcCharge
    : (typeof baseConfig?.deliveryCharge === 'number' && baseConfig.deliveryCharge >= 0 ? baseConfig.deliveryCharge : DEFAULT_DTDC_CHARGE);

  const storeBluedart = typeof baseConfig?.bluedartCharge === 'number' && baseConfig.bluedartCharge >= 0
    ? baseConfig.bluedartCharge
    : DEFAULT_BLUEDART_CHARGE;

  const threshold = typeof baseConfig?.freeDeliveryThreshold === 'number' && baseConfig.freeDeliveryThreshold >= 0
    ? baseConfig.freeDeliveryThreshold
    : DEFAULT_FREE_DELIVERY_THRESHOLD;

  if (!productsOrItems || !productsOrItems.length) {
    return {
      ...baseConfig,
      freeDeliveryThreshold: threshold,
      dtdcCharge: storeDtdc,
      bluedartCharge: storeBluedart,
    };
  }

  const state = options?.state ? String(options.state).trim().toLowerCase() : null;

  const dtdcRates = [];
  const bluedartRates = [];

  for (const item of productsOrItems) {
    const product = item?.product || item;
    if (!product) continue;

    let stateDtdc = null;
    let stateBluedart = null;
    if (state && product.statePricing) {
      try {
        const sp = typeof product.statePricing === 'string' ? JSON.parse(product.statePricing) : product.statePricing;
        if (sp && typeof sp === 'object') {
          const matchKey = Object.keys(sp).find(k => k.trim().toLowerCase() === state);
          if (matchKey && sp[matchKey] && typeof sp[matchKey] === 'object') {
            if (sp[matchKey].dtdcPrice != null && sp[matchKey].dtdcPrice !== '') stateDtdc = Number(sp[matchKey].dtdcPrice);
            if (sp[matchKey].bluedartPrice != null && sp[matchKey].bluedartPrice !== '') stateBluedart = Number(sp[matchKey].bluedartPrice);
          }
        }
      } catch {}
    }

    if (stateDtdc !== null && !isNaN(stateDtdc) && stateDtdc >= 0) {
      dtdcRates.push(stateDtdc);
    } else if (product.dtdcPrice !== null && product.dtdcPrice !== undefined && product.dtdcPrice !== '' && !isNaN(Number(product.dtdcPrice)) && Number(product.dtdcPrice) >= 0) {
      dtdcRates.push(Number(product.dtdcPrice));
    } else {
      dtdcRates.push(storeDtdc);
    }

    if (stateBluedart !== null && !isNaN(stateBluedart) && stateBluedart >= 0) {
      bluedartRates.push(stateBluedart);
    } else if (product.bluedartPrice !== null && product.bluedartPrice !== undefined && product.bluedartPrice !== '' && !isNaN(Number(product.bluedartPrice)) && Number(product.bluedartPrice) >= 0) {
      bluedartRates.push(Number(product.bluedartPrice));
    } else {
      bluedartRates.push(storeBluedart);
    }
  }

  const finalDtdc = dtdcRates.length > 0 ? Math.max(...dtdcRates) : storeDtdc;
  const finalBluedart = bluedartRates.length > 0 ? Math.max(...bluedartRates) : storeBluedart;

  return {
    ...baseConfig,
    freeDeliveryThreshold: threshold,
    dtdcCharge: finalDtdc,
    bluedartCharge: finalBluedart,
  };
}
