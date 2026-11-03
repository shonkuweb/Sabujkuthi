export const orderStages = [
  { key: 'Confirmed', label: 'Confirmed', badge: 'Order Confirmed' },
  { key: 'Selection', label: 'Selection', badge: 'Plant Selection' },
  { key: 'Packaging', label: 'Packaging', badge: 'Botanical Packaging' },
  { key: 'Dispatched', label: 'Dispatched', badge: 'Dispatched' },
  { key: 'Delivered', label: 'Delivered', badge: 'Delivered' },
];
export function orderStageIndex(status) {
  const legacy = { New: 'Confirmed', Processing: 'Selection', Shipped: 'Dispatched' };
  const index = orderStages.findIndex(stage => stage.key === (legacy[status] || status));
  return index < 0 ? 0 : index;
}
