export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export function getStateFromPincode(pincode) {
  if (!pincode || typeof pincode !== 'string') return null;
  const clean = pincode.trim().slice(0, 2);
  const prefix = Number(clean);
  if (!Number.isInteger(prefix)) return null;

  if (prefix === 11) return 'Delhi';
  if (prefix >= 12 && prefix <= 13) return 'Haryana';
  if (prefix >= 14 && prefix <= 16) return 'Punjab';
  if (prefix === 17) return 'Himachal Pradesh';
  if (prefix >= 18 && prefix <= 19) return 'Jammu and Kashmir';
  if (prefix >= 20 && prefix <= 28) {
    if (prefix === 24 || prefix === 26) return 'Uttarakhand'; // overlaps with UP in sub-ranges
    return 'Uttar Pradesh';
  }
  if (prefix >= 30 && prefix <= 34) return 'Rajasthan';
  if (prefix >= 36 && prefix <= 39) return 'Gujarat';
  if (prefix >= 40 && prefix <= 44) return 'Maharashtra';
  if (prefix >= 45 && prefix <= 48) return 'Madhya Pradesh';
  if (prefix === 49) return 'Chhattisgarh';
  if (prefix >= 50 && prefix <= 53) return 'Andhra Pradesh';
  if (prefix >= 56 && prefix <= 59) return 'Karnataka';
  if (prefix >= 60 && prefix <= 64) return 'Tamil Nadu';
  if (prefix >= 67 && prefix <= 69) return 'Kerala';
  if (prefix >= 70 && prefix <= 74) return 'West Bengal';
  if (prefix >= 75 && prefix <= 77) return 'Odisha';
  if (prefix === 78) return 'Assam';
  if (prefix === 79) return 'Arunachal Pradesh'; // North East region
  if (prefix >= 80 && prefix <= 85) return 'Bihar';
  return null;
}

export function isProductDeliverableToLocation(product, customerPincode) {
  if (!customerPincode || !/^[1-9]\d{5}$/.test(customerPincode.trim())) {
    return { deliverable: true }; // Cannot validate without pincode
  }
  const cleanPincode = customerPincode.trim();
  const scope = product.shippingScope || (product.deliveryPincodes ? 'pincodes' : 'all_india');

  if (scope === 'all_india') {
    return { deliverable: true };
  }

  if (scope === 'pincodes') {
    const allowed = (product.deliveryPincodes || '')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    if (!allowed.length) return { deliverable: true };
    const deliverable = allowed.includes(cleanPincode);
    return {
      deliverable,
      scope: 'pincodes',
      message: deliverable
        ? 'Delivery available to this pincode.'
        : `This plant only ships to selected pincodes (${allowed.slice(0, 3).join(', ')}${allowed.length > 3 ? '...' : ''}).`,
    };
  }

  if (scope === 'states') {
    const allowedStates = (product.deliveryStates || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (!allowedStates.length) return { deliverable: true };

    const detectedState = getStateFromPincode(cleanPincode);
    const deliverable = detectedState && allowedStates.includes(detectedState.toLowerCase());

    return {
      deliverable,
      scope: 'states',
      detectedState,
      message: deliverable
        ? `Delivery available in ${detectedState}.`
        : `This plant is only available for delivery in ${product.deliveryStates}.`,
    };
  }

  return { deliverable: true };
}
