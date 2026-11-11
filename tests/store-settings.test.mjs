import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryPaise, DEFAULT_DELIVERY_CHARGE, DEFAULT_FREE_DELIVERY_THRESHOLD } from '../lib/shipping.mjs';
import { validateDeliverySettings, defaultDeliverySettings } from '../lib/delivery-settings.mjs';
import { validateHeroSettings, defaultHeroSettings } from '../lib/hero-settings.mjs';
import { prepareCheckout } from '../lib/payment-core.mjs';

const product = { id: 'p1', slug: 'plant', title: 'Plant', price: '100.00', inStock: true, isPublished: true, category: { isVisible: true } };
const customer = { name: 'Test Customer', phone: '9999999999', address: '10 Test Road, Test City', pincode: '721152' };

test('deliveryPaise respects default thresholds and custom store delivery settings', () => {
  // Defaults
  assert.equal(deliveryPaise(0), 0);
  assert.equal(deliveryPaise(399899), DEFAULT_DELIVERY_CHARGE * 100);
  assert.equal(deliveryPaise(399900), 0);

  // Custom configuration: charge Rs 60, free delivery at Rs 2000
  const customConfig = { deliveryCharge: 60, freeDeliveryThreshold: 2000 };
  assert.equal(deliveryPaise(150000, customConfig), 6000);
  assert.equal(deliveryPaise(200000, customConfig), 0);
  assert.equal(deliveryPaise(250000, customConfig), 0);

  // Free delivery for all orders (threshold = 0)
  assert.equal(deliveryPaise(50000, { deliveryCharge: 40, freeDeliveryThreshold: 0 }), 0);

  // Zero delivery fee
  assert.equal(deliveryPaise(50000, { deliveryCharge: 0, freeDeliveryThreshold: 5000 }), 0);
});

test('validateDeliverySettings validates ranges and rejects invalid data', () => {
  assert.deepEqual(validateDeliverySettings({ deliveryCharge: '50', freeDeliveryThreshold: '2500' }), {
    deliveryCharge: 50,
    freeDeliveryThreshold: 2500,
  });
  assert.throws(() => validateDeliverySettings(null));
  assert.throws(() => validateDeliverySettings({ deliveryCharge: -10, freeDeliveryThreshold: 2000 }));
  assert.throws(() => validateDeliverySettings({ deliveryCharge: 40, freeDeliveryThreshold: -500 }));
  assert.throws(() => validateDeliverySettings({ deliveryCharge: 'invalid', freeDeliveryThreshold: 2000 }));
});

test('validateHeroSettings enforces image limits and sanitizes ticker texts', () => {
  const input = {
    announcementText: '  Flash sale!  ',
    announcementVisible: false,
    heroImages: [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'invalid-url',
      'https://example.com/3.jpg',
      'https://example.com/4.jpg',
      'https://example.com/5.jpg',
      'https://example.com/6.jpg', // should be trimmed to 5
    ],
    belowTickerText: '  Special below ticker text  ',
    endTickerText: '  Special end packing notice  ',
  };

  const validated = validateHeroSettings(input);
  assert.equal(validated.announcementText, 'Flash sale!');
  assert.equal(validated.announcementVisible, false);
  assert.equal(validated.heroImages.length, 5);
  assert.equal(validated.heroImages[0], 'https://example.com/1.jpg');
  assert.equal(validated.heroImages[4], 'https://example.com/5.jpg');
  assert.equal(validated.desktopHeroImages.length, 5);
  assert.equal(validated.mobileHeroImages.length, 0);
  assert.equal(validated.belowTickerText, 'Special below ticker text');
  assert.equal(validated.endTickerText, 'Special end packing notice');
});

test('validateHeroSettings supports independent mobile and desktop hero banners', () => {
  const input = {
    mobileHeroImages: [
      'https://example.com/m1.jpg',
      'https://example.com/m2.jpg',
    ],
    desktopHeroImages: [
      'https://example.com/d1.jpg',
      'https://example.com/d2.jpg',
      'https://example.com/d3.jpg',
    ],
  };

  const validated = validateHeroSettings(input);
  assert.equal(validated.mobileHeroImages.length, 2);
  assert.equal(validated.mobileHeroImages[0], 'https://example.com/m1.jpg');
  assert.equal(validated.desktopHeroImages.length, 3);
  assert.equal(validated.desktopHeroImages[0], 'https://example.com/d1.jpg');
  assert.equal(validated.heroImages.length, 3); // synced with desktop
});

test('prepareCheckout calculates totals with dynamic delivery settings', () => {
  const input = { customer, items: [{ slug: 'plant', qty: 2 }] };
  
  // With default settings (2 * 100 = Rs 200 => below 3999 => Rs 40 delivery => total 240)
  const quoteDefault = prepareCheckout(input, [product]);
  assert.equal(quoteDefault.subtotal, 20000);
  assert.equal(quoteDefault.shipping, 4000);
  assert.equal(quoteDefault.total, 24000);

  // With custom settings: Rs 80 delivery fee, free at Rs 1000
  const quoteCustom = prepareCheckout(input, [product], { deliveryCharge: 80, freeDeliveryThreshold: 1000 });
  assert.equal(quoteCustom.subtotal, 20000);
  assert.equal(quoteCustom.shipping, 8000);
  assert.equal(quoteCustom.total, 28000);

  // With custom settings qualifying for free delivery: free at Rs 150
  const quoteFree = prepareCheckout(input, [product], { deliveryCharge: 80, freeDeliveryThreshold: 150 });
  assert.equal(quoteFree.subtotal, 20000);
  assert.equal(quoteFree.shipping, 0);
  assert.equal(quoteFree.total, 20000);
});
