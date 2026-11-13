import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultNavbarSettings, validateNavbarSettings } from '../lib/navbar-settings.mjs';

test('validateNavbarSettings returns defaults when given empty or invalid input', () => {
  const res1 = validateNavbarSettings(null);
  assert.equal(res1.valid, true);
  assert.equal(res1.settings.items.length >= 3, true);

  const res2 = validateNavbarSettings({});
  assert.equal(res2.valid, true);
  assert.equal(res2.settings.items.length >= 3, true);

  const res3 = validateNavbarSettings({ items: 'not an array' });
  assert.equal(res3.valid, true);
  assert.equal(res3.settings.items.length >= 3, true);
});

test('validateNavbarSettings sanitizes labels, hrefs, and productIds', () => {
  const input = {
    items: [
      {
        id: 'mixed-fertilizer',
        label: '  Premium Organic Fertilizer  ',
        href: '  /special-fertilizers  ',
        enabled: true,
        description: '  Custom description text  ',
        productIds: ['p1', 'p2', 'p1', '', null],
      },
      {
        id: 'new-collection',
        label: 'New Arrivals 2026',
        href: '/new-collection',
        enabled: false,
        productIds: ['p3'],
      },
    ],
  };

  const { valid, settings } = validateNavbarSettings(input);
  assert.equal(valid, true);
  assert.equal(settings.items.length, 2);

  const mixed = settings.items.find((i) => i.id === 'mixed-fertilizer');
  assert.equal(mixed.label, 'Premium Organic Fertilizer');
  assert.equal(mixed.href, '/special-fertilizers');
  assert.equal(mixed.enabled, true);
  assert.equal(mixed.description, 'Custom description text');
  assert.deepEqual(mixed.productIds, ['p1', 'p2']);

  const newCol = settings.items.find((i) => i.id === 'new-collection');
  assert.equal(newCol.enabled, false);
  assert.equal(newCol.label, 'New Arrivals 2026');
});

test('validateNavbarSettings supports adding new custom links and deleting existing ones', () => {
  const customInput = {
    items: [
      {
        id: 'summer-plants',
        label: 'Summer Flowering Plants',
        href: '/showcase/summer-plants',
        enabled: true,
        description: 'Vibrant flowering plants for summer.',
        productIds: ['prod-summer-1', 'prod-summer-2'],
      },
      {
        id: 'contact-page',
        label: 'Contact Nursery',
        href: '/contact',
        enabled: true,
        productIds: [],
      },
    ],
  };

  const { valid, settings } = validateNavbarSettings(customInput);
  assert.equal(valid, true);
  assert.equal(settings.items.length, 2);

  const summer = settings.items.find((i) => i.id === 'summer-plants');
  assert.ok(summer);
  assert.equal(summer.label, 'Summer Flowering Plants');
  assert.equal(summer.href, '/showcase/summer-plants');
  assert.deepEqual(summer.productIds, ['prod-summer-1', 'prod-summer-2']);

  // Verify deleted items ('mixed-fertilizer', 'new-collection', 'blog') are deleted and not re-injected
  assert.equal(settings.items.some((i) => i.id === 'mixed-fertilizer'), false);
  assert.equal(settings.items.some((i) => i.id === 'blog'), false);
});
