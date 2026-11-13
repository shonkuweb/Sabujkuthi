export const NAVBAR_SETTINGS_KEY = 'navbar_settings';

export const defaultNavbarSettings = {
  items: [
    {
      id: 'mixed-fertilizer',
      label: 'Mixed Fertilizer',
      href: '/mixed-fertilizer',
      enabled: true,
      description: 'Specialized organic plant food & nutrient blends for healthy growth and blooming.',
      productIds: [],
    },
    {
      id: 'new-collection',
      label: 'New Collection',
      href: '/new-collection',
      enabled: true,
      description: 'Fresh arrivals, exotic varieties, and newly potted nursery selections.',
      productIds: [],
    },
    {
      id: 'blog',
      label: 'Blog',
      href: '/blog',
      enabled: true,
      description: 'Expert plant care guides, organic fertilizer tips, and nursery updates.',
      productIds: [],
    },
  ],
};

export function validateNavbarSettings(input) {
  if (!input || typeof input !== 'object') {
    return { valid: true, settings: defaultNavbarSettings };
  }

  // If input.items is not provided or not an array, fallback to default
  if (!Array.isArray(input.items)) {
    return { valid: true, settings: defaultNavbarSettings };
  }

  const validatedItems = [];
  const seenIds = new Set();

  for (const item of input.items) {
    if (!item || typeof item !== 'object') continue;

    const rawLabel = typeof item.label === 'string' ? item.label.trim() : '';
    let rawId = String(item.id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 50);

    if (!rawId && rawLabel) {
      rawId = rawLabel.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 50);
    }
    if (!rawId) {
      rawId = `link-${Date.now()}`;
    }

    // Ensure unique ID
    let finalId = rawId;
    let counter = 1;
    while (seenIds.has(finalId)) {
      finalId = `${rawId}-${counter++}`;
    }
    seenIds.add(finalId);

    const label = rawLabel
      ? rawLabel.slice(0, 60)
      : finalId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    let href = typeof item.href === 'string' && item.href.trim()
      ? item.href.trim().slice(0, 150)
      : `/showcase/${finalId}`;

    if (!href.startsWith('/') && !href.startsWith('http://') && !href.startsWith('https://')) {
      href = `/${href}`;
    }

    const description = typeof item.description === 'string'
      ? item.description.trim().slice(0, 500)
      : '';

    const productIds = Array.isArray(item.productIds)
      ? [...new Set(item.productIds.filter(Boolean).map(String).map(s => s.trim()).filter(Boolean))]
      : [];

    validatedItems.push({
      id: finalId,
      label,
      href,
      enabled: Boolean(item.enabled !== false),
      description,
      productIds,
    });
  }

  return {
    valid: true,
    settings: {
      items: validatedItems,
    },
  };
}
