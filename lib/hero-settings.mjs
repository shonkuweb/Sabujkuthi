import { business } from './business.mjs';

export const HERO_SETTINGS_KEY = 'homepage_hero_settings';

export const defaultHeroSettings = {
  announcementText: '',
  announcementVisible: true,
  heroImages: [],
  desktopHeroImages: [],
  mobileHeroImages: [],
  belowTickerText: `${business.name} · ${business.address}  |  Call / WhatsApp: ${business.phoneDisplay}`,
  endTickerText: '🌿 Since plants are delicate and require careful selection and packing from the field, please allow 4–5 days for us to prepare your order.',
};

export function validateHeroSettings(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid hero settings.');

  const announcementText = typeof input.announcementText === 'string' ? input.announcementText.trim().slice(0, 500) : '';
  const announcementVisible = Boolean(input.announcementVisible !== false);

  const sanitizeImageList = (list, max = 5) => {
    const arr = Array.isArray(list) ? list : [];
    return arr
      .map(url => (typeof url === 'string' ? url.trim() : ''))
      .filter(url => /^https?:\/\/[^\s]+$/.test(url))
      .slice(0, max);
  };

  let heroImages = sanitizeImageList(input.heroImages, 5);
  let desktopHeroImages = sanitizeImageList(input.desktopHeroImages, 5);
  let mobileHeroImages = sanitizeImageList(input.mobileHeroImages, 5);

  // If desktopHeroImages was not explicitly provided but legacy heroImages was provided
  if (desktopHeroImages.length === 0 && heroImages.length > 0 && !Array.isArray(input.desktopHeroImages)) {
    desktopHeroImages = [...heroImages];
  }

  // Keep legacy heroImages populated for backwards compatibility
  if (heroImages.length === 0 && desktopHeroImages.length > 0) {
    heroImages = [...desktopHeroImages];
  }

  const belowTickerText = typeof input.belowTickerText === 'string' && input.belowTickerText.trim()
    ? input.belowTickerText.trim().slice(0, 1000)
    : `${business.name} · ${business.address}  |  Call / WhatsApp: ${business.phoneDisplay}`;

  const endTickerText = typeof input.endTickerText === 'string' && input.endTickerText.trim()
    ? input.endTickerText.trim().slice(0, 1000)
    : '🌿 Since plants are delicate and require careful selection and packing from the field, please allow 4–5 days for us to prepare your order.';

  return {
    announcementText,
    announcementVisible,
    heroImages,
    desktopHeroImages,
    mobileHeroImages,
    belowTickerText,
    endTickerText,
  };
}

export async function getStoredHeroSettings(prismaClient) {
  try {
    const saved = await prismaClient.settings.findUnique({ where: { key: HERO_SETTINGS_KEY } });
    if (saved?.value) {
      return validateHeroSettings(JSON.parse(saved.value));
    }
  } catch {}
  return defaultHeroSettings;
}
