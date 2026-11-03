export const DEFAULT_FREE_DELIVERY_THRESHOLD = 3999;
export const DEFAULT_DELIVERY_CHARGE = 40;
export const FREE_DELIVERY_THRESHOLD = DEFAULT_FREE_DELIVERY_THRESHOLD;
export const DELIVERY_CHARGE = DEFAULT_DELIVERY_CHARGE;

export function deliveryPaise(subtotal, config = {}) {
  const charge = typeof config?.deliveryCharge === 'number' && config.deliveryCharge >= 0
    ? config.deliveryCharge
    : DELIVERY_CHARGE;
  const threshold = typeof config?.freeDeliveryThreshold === 'number' && config.freeDeliveryThreshold >= 0
    ? config.freeDeliveryThreshold
    : FREE_DELIVERY_THRESHOLD;
  return subtotal === 0 || subtotal >= threshold * 100 ? 0 : Math.round(charge * 100);
}
