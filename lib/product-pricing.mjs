/**
 * Calculates effective product price considering:
 * 1. Variant option (e.g. Adenium option override)
 * 2. State-specific price override (e.g. West Bengal, Maharashtra)
 * 3. Base product selling price and original price
 */
export function getProductPriceInfo(product, { state, variant } = {}) {
  if (!product) {
    return { price: '0', oldPrice: null, isStatePrice: false, matchedState: null };
  }

  let price = String(product.price ?? '0');
  let oldPrice = product.oldPrice ? String(product.oldPrice) : null;
  let isStatePrice = false;
  let matchedState = null;

  // 1. Variant override takes precedence if present
  let adeniumOptions = {};
  try {
    adeniumOptions = typeof product.adeniumOptions === 'string'
      ? JSON.parse(product.adeniumOptions || '{}')
      : (product.adeniumOptions || {});
  } catch {}

  if (variant && adeniumOptions && adeniumOptions[variant] != null && adeniumOptions[variant] !== '') {
    price = String(adeniumOptions[variant]);
    return { price, oldPrice, isStatePrice: false, matchedState: null };
  }

  // 2. State-specific price override
  if (state && product.statePricing) {
    let statePricing = {};
    try {
      statePricing = typeof product.statePricing === 'string'
        ? JSON.parse(product.statePricing || '{}')
        : (product.statePricing || {});
    } catch {}

    if (statePricing && typeof statePricing === 'object') {
      const cleanState = String(state).trim().toLowerCase();
      const stateKey = Object.keys(statePricing).find(
        key => key.trim().toLowerCase() === cleanState
      );
      if (stateKey && statePricing[stateKey]) {
        const entry = statePricing[stateKey];
        if (typeof entry === 'object' && entry !== null && entry.price != null && entry.price !== '') {
          price = String(entry.price);
          if (entry.oldPrice != null && entry.oldPrice !== '') {
            oldPrice = String(entry.oldPrice);
          }
          isStatePrice = true;
          matchedState = stateKey;
        } else if (typeof entry === 'string' || typeof entry === 'number') {
          price = String(entry);
          isStatePrice = true;
          matchedState = stateKey;
        }
      }
    }
  }

  return { price, oldPrice, isStatePrice, matchedState };
}
