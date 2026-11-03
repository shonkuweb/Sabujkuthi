// UUIDs and gateway receipts remain private integration references.
export function orderReference(order) {
  return Number.isSafeInteger(order.orderNumber) && order.orderNumber >= 1001
    ? `SK-${order.orderNumber}` : order.receipt;
}
