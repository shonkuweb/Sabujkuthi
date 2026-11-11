import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCategoryTree,
  flattenCategoryTree,
  getDescendantIds,
  getCategoryPath,
  getCategoryAndDescendantIds,
} from '../lib/category-tree.mjs';
import {
  calculateDiscount,
  getDiscountNudgeStatus,
  validateOffersSettings,
} from '../lib/discounts.mjs';
import {
  getStateFromPincode,
  isProductDeliverableToLocation,
} from '../lib/indian-regions.mjs';
import { prepareCheckout, CheckoutError } from '../lib/payment-core.mjs';

test('category tree functions correctly build hierarchy and calculate descendants', () => {
  const categories = [
    { id: 'plants', name: 'Plants', parentId: null },
    { id: 'indoor', name: 'Indoor Plants', parentId: 'plants' },
    { id: 'flowering', name: 'Flowering Indoor', parentId: 'indoor' },
    { id: 'pots', name: 'Pots & Planters', parentId: null },
  ];

  const tree = buildCategoryTree(categories);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].id, 'plants');
  assert.equal(tree[0].children.length, 1);
  assert.equal(tree[0].children[0].id, 'indoor');
  assert.equal(tree[0].children[0].children[0].id, 'flowering');

  const flat = flattenCategoryTree(tree);
  assert.equal(flat.length, 4);
  assert.equal(flat[0].name, 'Plants');
  assert.equal(flat[0].depth, 0);
  assert.equal(flat[1].name, 'Indoor Plants');
  assert.equal(flat[1].depth, 1);
  assert.equal(flat[2].name, 'Flowering Indoor');
  assert.equal(flat[2].depth, 2);

  const plantDescendants = getDescendantIds('plants', categories);
  assert.ok(plantDescendants.has('indoor'));
  assert.ok(plantDescendants.has('flowering'));
  assert.ok(!plantDescendants.has('pots'));

  const path = getCategoryPath('flowering', categories);
  assert.deepEqual(path.map(c => c.id), ['plants', 'indoor', 'flowering']);

  const allPlantIds = getCategoryAndDescendantIds('plants', categories);
  assert.deepEqual(allPlantIds.sort(), ['flowering', 'indoor', 'plants'].sort());
});

test('discount calculation and 51% nudge rules behave correctly', () => {
  const rule = {
    enabled: true,
    title: 'Festive Offer',
    type: 'percentage',
    value: 10,
    minOrderAmount: 1000,
    maxDiscount: 200,
    nudgeThresholdPercent: 51,
  };

  // Below 51% threshold: ₹500 / ₹1000 = 50%
  const nudge50 = getDiscountNudgeStatus(500, rule);
  assert.equal(nudge50.isNudgeEligible, false);
  assert.equal(nudge50.isSatisfied, false);

  // At or above 51% threshold: ₹510 / ₹1000 = 51%
  const nudge51 = getDiscountNudgeStatus(510, rule);
  assert.equal(nudge51.isNudgeEligible, true);
  assert.equal(nudge51.isSatisfied, false);
  assert.equal(nudge51.remainingAmount, 490);

  // At 80% threshold: ₹800 / ₹1000
  const nudge80 = getDiscountNudgeStatus(800, rule);
  assert.equal(nudge80.isNudgeEligible, true);
  assert.equal(nudge80.isSatisfied, false);
  assert.equal(nudge80.remainingAmount, 200);

  // At or above target: ₹1200
  const nudgeSatisfied = getDiscountNudgeStatus(1200, rule);
  assert.equal(nudgeSatisfied.isSatisfied, true);

  // Discount calculation
  assert.equal(calculateDiscount(500, rule), 0); // below min
  assert.equal(calculateDiscount(1000, rule), 100); // 10% of 1000
  assert.equal(calculateDiscount(1500, rule), 150); // 10% of 1500
  assert.equal(calculateDiscount(3000, rule), 200); // capped at maxDiscount 200

  // Fixed discount calculation
  const fixedRule = { ...rule, type: 'fixed', value: 150 };
  assert.equal(calculateDiscount(1200, fixedRule), 150);

  // Validate settings
  const validated = validateOffersSettings({
    announcementText: 'Hello world',
    discountRule: { enabled: true, minOrderAmount: 500 },
  });
  assert.equal(validated.valid, true);
  assert.equal(validated.settings.discountRule.minOrderAmount, 500);
});

test('pincode and state delivery checks correctly restrict purchase', () => {
  assert.equal(getStateFromPincode('700001'), 'West Bengal');
  assert.equal(getStateFromPincode('721253'), 'West Bengal');
  assert.equal(getStateFromPincode('110001'), 'Delhi');
  assert.equal(getStateFromPincode('400001'), 'Maharashtra');

  // Product 1: All India
  const allIndiaProd = {
    id: 'p1',
    slug: 'all-india-plant',
    shippingScope: 'all_india',
  };
  assert.equal(isProductDeliverableToLocation(allIndiaProd, '700001').deliverable, true);
  assert.equal(isProductDeliverableToLocation(allIndiaProd, '110001').deliverable, true);

  // Product 2: Specific States (West Bengal, Odisha)
  const stateProd = {
    id: 'p2',
    slug: 'local-plant',
    shippingScope: 'states',
    deliveryStates: 'West Bengal, Odisha',
  };
  assert.equal(isProductDeliverableToLocation(stateProd, '700001').deliverable, true);
  assert.equal(isProductDeliverableToLocation(stateProd, '751001').deliverable, true); // Odisha
  assert.equal(isProductDeliverableToLocation(stateProd, '110001').deliverable, false); // Delhi

  // Product 3: Specific Pincodes
  const pincodeProd = {
    id: 'p3',
    slug: 'rare-plant',
    shippingScope: 'pincodes',
    deliveryPincodes: '721253, 700001',
  };
  assert.equal(isProductDeliverableToLocation(pincodeProd, '721253').deliverable, true);
  assert.equal(isProductDeliverableToLocation(pincodeProd, '700001').deliverable, true);
  assert.equal(isProductDeliverableToLocation(pincodeProd, '700002').deliverable, false);
});

test('prepareCheckout blocks orders when customer pincode is outside shipping scope', () => {
  const restrictedProduct = {
    id: 'p1',
    slug: 'rare-rose',
    title: 'Rare Rose',
    price: '500',
    isPublished: true,
    inStock: true,
    category: { isVisible: true },
    shippingScope: 'states',
    deliveryStates: 'West Bengal',
  };

  const validCustomer = {
    name: 'Suman Roy',
    phone: '9876543210',
    address: '123 Station Road, Medinipur',
    pincode: '721253', // West Bengal
  };

  const outOfStateCustomer = {
    ...validCustomer,
    address: '456 Connaught Place, New Delhi',
    pincode: '110001', // Delhi
  };

  const inputValid = {
    customer: validCustomer,
    items: [{ slug: 'rare-rose', qty: 1 }],
  };

  const inputInvalid = {
    customer: outOfStateCustomer,
    items: [{ slug: 'rare-rose', qty: 1 }],
  };

  // Valid order succeeds
  const prepared = prepareCheckout(inputValid, [restrictedProduct]);
  assert.equal(prepared.subtotal, 50000);

  // Invalid order throws CheckoutError
  assert.throws(
    () => prepareCheckout(inputInvalid, [restrictedProduct]),
    CheckoutError
  );
});

test('customer session correctly preserves state and pincode', async () => {
  const { createCustomerSession, verifyCustomerSession } = await import('../lib/customer-session.mjs');
  const token = await createCustomerSession({
    id: 'cust-wb',
    phone: '8637054105',
    name: 'Anirban',
    state: 'West Bengal',
    pincode: '721253',
  });

  const verified = await verifyCustomerSession(token);
  assert.ok(verified);
  assert.equal(verified.id, 'cust-wb');
  assert.equal(verified.state, 'West Bengal');
  assert.equal(verified.pincode, '721253');
});
