export const FREE_DELIVERY_THRESHOLD = 3999;
export const DELIVERY_CHARGE = 40;
export function deliveryPaise(subtotal) {
  return subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD * 100 ? 0 : DELIVERY_CHARGE * 100;
}
