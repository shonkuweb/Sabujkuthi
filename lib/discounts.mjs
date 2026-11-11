export const DEFAULT_OFFERS_SETTINGS = {
  announcementVisible: true,
  announcementText: 'Special Offer: Free shipping on orders above ₹3,999! 🌿',
  discountRule: {
    enabled: true,
    title: 'Festive Celebration',
    type: 'percentage', // 'percentage' | 'fixed'
    value: 10, // 10% or ₹100
    minOrderAmount: 999, // Minimum order ₹999
    maxDiscount: 350, // Max cap ₹350
    nudgeThresholdPercent: 51, // Show banner when >= 51% of minOrderAmount
    nudgeBannerEnabled: true,
    bannerText: '',
    bannerCtaText: 'Add More Plants',
    bannerCtaLink: '/collection',
  },
};

export function validateOffersSettings(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid settings payload.' };
  }

  const announcementVisible = data.announcementVisible !== false;
  const announcementText = typeof data.announcementText === 'string'
    ? data.announcementText.slice(0, 300)
    : DEFAULT_OFFERS_SETTINGS.announcementText;

  const rawRule = data.discountRule || {};
  const enabled = Boolean(rawRule.enabled);
  const title = typeof rawRule.title === 'string' && rawRule.title.trim()
    ? rawRule.title.trim().slice(0, 80)
    : 'Special Store Discount';
  const type = rawRule.type === 'fixed' ? 'fixed' : 'percentage';
  const value = Math.max(1, Math.min(10000, Number(rawRule.value) || 10));
  const minOrderAmount = Math.max(10, Math.min(100000, Number(rawRule.minOrderAmount) || 999));
  const maxDiscount = rawRule.maxDiscount ? Math.max(1, Number(rawRule.maxDiscount)) : null;
  const nudgeThresholdPercent = Math.max(10, Math.min(99, Number(rawRule.nudgeThresholdPercent) || 51));
  const nudgeBannerEnabled = rawRule.nudgeBannerEnabled !== false;
  const bannerText = typeof rawRule.bannerText === 'string' ? rawRule.bannerText.slice(0, 200) : '';
  const bannerCtaText = typeof rawRule.bannerCtaText === 'string' && rawRule.bannerCtaText.trim()
    ? rawRule.bannerCtaText.trim().slice(0, 40)
    : 'Add More Plants';
  const bannerCtaLink = typeof rawRule.bannerCtaLink === 'string' && rawRule.bannerCtaLink.startsWith('/')
    ? rawRule.bannerCtaLink
    : '/collection';

  return {
    valid: true,
    settings: {
      announcementVisible,
      announcementText,
      discountRule: {
        enabled,
        title,
        type,
        value,
        minOrderAmount,
        maxDiscount,
        nudgeThresholdPercent,
        nudgeBannerEnabled,
        bannerText,
        bannerCtaText,
        bannerCtaLink,
      },
    },
  };
}

export function calculateDiscount(subtotalRupees, rule) {
  if (!rule || !rule.enabled || typeof subtotalRupees !== 'number' || subtotalRupees < rule.minOrderAmount) {
    return 0;
  }
  let discount = 0;
  if (rule.type === 'percentage') {
    discount = (subtotalRupees * rule.value) / 100;
    if (rule.maxDiscount && discount > rule.maxDiscount) {
      discount = rule.maxDiscount;
    }
  } else {
    discount = Math.min(rule.value, subtotalRupees);
  }
  return Math.max(0, Math.round(discount));
}

export function getDiscountNudgeStatus(subtotalRupees, rule) {
  if (!rule || !rule.enabled || !rule.minOrderAmount) {
    return { isNudgeEligible: false, isSatisfied: false, percentage: 0, remainingAmount: 0 };
  }
  const min = rule.minOrderAmount;
  const current = Math.max(0, Number(subtotalRupees) || 0);
  const percentage = Math.round((current / min) * 100);
  const threshold = rule.nudgeThresholdPercent || 51;
  const isSatisfied = current >= min;
  const isNudgeEligible = !isSatisfied && percentage >= threshold;
  const remainingAmount = Math.max(0, min - current);
  const discountLabel = rule.type === 'percentage' ? `${rule.value}% OFF` : `₹${rule.value} OFF`;

  return {
    isNudgeEligible,
    isSatisfied,
    percentage: Math.min(100, percentage),
    current,
    min,
    remainingAmount,
    discountLabel,
    ruleTitle: rule.title || 'Special Discount',
    bannerCtaText: rule.bannerCtaText || 'Add More Plants',
    bannerCtaLink: rule.bannerCtaLink || '/collection',
  };
}
