import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductPriceInfo } from '../lib/product-pricing.mjs';
import { deliveryPaise, DEFAULT_DTDC_CHARGE, DEFAULT_BLUEDART_CHARGE } from '../lib/shipping.mjs';
import { validateDeliverySettings, defaultDeliverySettings } from '../lib/delivery-settings.mjs';
import { prepareCheckout } from '../lib/payment-core.mjs';

test('getProductPriceInfo resolves base price, variant overrides, and state-specific overrides', () => {
  const baseProduct = {
    id: 'prod-1',
    title: 'Test Bonsai',
    price: '699',
    oldPrice: '999',
    statePricing: JSON.stringify({
      'West Bengal': { price: '599', oldPrice: '899' },
      'Maharashtra': { price: '749', oldPrice: '1099' },
    }),
    adeniumOptions: JSON.stringify({
      'Jumbo Grafted': '850',
    }),
  };

  // 1. Without state or variant -> base price
  const baseInfo = getProductPriceInfo(baseProduct);
  assert.equal(baseInfo.price, '699');
  assert.equal(baseInfo.oldPrice, '999');
  assert.equal(baseInfo.isStatePrice, false);
  assert.equal(baseInfo.matchedState, null);

  // 2. With state 'West Bengal' (case-insensitive) -> West Bengal price
  const wbInfo = getProductPriceInfo(baseProduct, { state: 'west bengal' });
  assert.equal(wbInfo.price, '599');
  assert.equal(wbInfo.oldPrice, '899');
  assert.equal(wbInfo.isStatePrice, true);
  assert.equal(wbInfo.matchedState, 'West Bengal');

  // 3. With state 'Maharashtra' -> Maharashtra price
  const mhInfo = getProductPriceInfo(baseProduct, { state: 'Maharashtra' });
  assert.equal(mhInfo.price, '749');
  assert.equal(mhInfo.oldPrice, '1099');
  assert.equal(mhInfo.isStatePrice, true);
  assert.equal(mhInfo.matchedState, 'Maharashtra');

  // 4. With unmatched state 'Delhi' -> falls back to base price
  const delhiInfo = getProductPriceInfo(baseProduct, { state: 'Delhi' });
  assert.equal(delhiInfo.price, '699');
  assert.equal(delhiInfo.oldPrice, '999');
  assert.equal(delhiInfo.isStatePrice, false);

  // 5. With variant specified -> variant price takes precedence
  const variantInfo = getProductPriceInfo(baseProduct, { state: 'West Bengal', variant: 'Jumbo Grafted' });
  assert.equal(variantInfo.price, '850');
  assert.equal(variantInfo.isStatePrice, false);
});

test('deliveryPaise calculates DTDC and Blue Dart charges based on store settings and thresholds', () => {
  const customConfig = {
    freeDeliveryThreshold: 3999,
    charge: 50,
    dtdcCharge: 50,
    bluedartCharge: 110,
  };

  // Under threshold (e.g. ₹1000)
  const dtdcUnder = deliveryPaise(100000, customConfig, 'dtdc');
  assert.equal(dtdcUnder, 5000); // ₹50

  const bluedartUnder = deliveryPaise(100000, customConfig, 'bluedart');
  assert.equal(bluedartUnder, 11000); // ₹110

  // At or above free delivery threshold (e.g. ₹4000)
  const dtdcFree = deliveryPaise(400000, customConfig, 'dtdc');
  assert.equal(dtdcFree, 0); // DTDC is completely FREE

  const bluedartExpressUpgrade = deliveryPaise(400000, customConfig, 'bluedart');
  assert.equal(bluedartExpressUpgrade, 6000); // 110 - 50 = ₹60 express difference

  // Default charges when no config passed
  assert.equal(deliveryPaise(100000, {}, 'dtdc'), DEFAULT_DTDC_CHARGE * 100);
  assert.equal(deliveryPaise(100000, {}, 'bluedart'), DEFAULT_BLUEDART_CHARGE * 100);
});

test('validateDeliverySettings handles dtdcCharge and bluedartCharge settings', () => {
  const result = validateDeliverySettings({
    freeDeliveryThreshold: '2999',
    deliveryCharge: '45',
    dtdcCharge: '45',
    bluedartCharge: '95',
  });

  assert.equal(result.freeDeliveryThreshold, 2999);
  assert.equal(result.deliveryCharge, 45);
  assert.equal(result.dtdcCharge, 45);
  assert.equal(result.bluedartCharge, 95);

  // Throws for invalid or negative charges
  assert.throws(
    () => validateDeliverySettings({ freeDeliveryThreshold: 2999, dtdcCharge: -10 }),
    /Delivery charge must be a valid amount/
  );
  assert.throws(
    () => validateDeliverySettings({ freeDeliveryThreshold: 2999, bluedartCharge: -5 }),
    /Blue Dart delivery charge must be a valid amount/
  );
});

test('prepareCheckout computes line items with state pricing and sets courier option', () => {
  const products = [
    {
      id: 'p1',
      slug: 'rare-rose',
      title: 'Rare Rose',
      price: '500',
      isPublished: true,
      inStock: true,
      category: { isVisible: true },
      statePricing: JSON.stringify({
        'West Bengal': { price: '450' },
      }),
    },
  ];

  const inputWb = {
    customer: {
      name: 'Sneha Roy',
      phone: '9876543210',
      address: 'Salt Lake City Sector 1',
      pincode: '700064', // West Bengal pincode
      state: 'West Bengal',
    },
    items: [{ slug: 'rare-rose', qty: 2 }],
    courier: 'bluedart',
  };

  const deliveryConfig = {
    freeDeliveryThreshold: 3999,
    charge: 40,
    dtdcCharge: 40,
    bluedartCharge: 90,
  };

  const checkoutWb = prepareCheckout(inputWb, products, deliveryConfig);
  // Unit price should be 45000 paise (₹450) instead of base 50000 paise (₹500)
  assert.equal(checkoutWb.subtotal, 90000); // 2 * 450 = ₹900
  assert.equal(checkoutWb.courier, 'bluedart');
  assert.equal(checkoutWb.shipping, 9000); // ₹90
  assert.equal(checkoutWb.total, 99000); // ₹990

  // Now test with DTDC courier
  const inputDtdc = {
    ...inputWb,
    courier: 'dtdc',
  };
  const checkoutDtdc = prepareCheckout(inputDtdc, products, deliveryConfig);
  assert.equal(checkoutDtdc.courier, 'dtdc');
  assert.equal(checkoutDtdc.shipping, 4000); // ₹40
  assert.equal(checkoutDtdc.total, 94000); // ₹940

  // Request hashes must differ between DTDC and Blue Dart to prevent replay
  assert.notEqual(checkoutWb.requestHash, checkoutDtdc.requestHash);
});
