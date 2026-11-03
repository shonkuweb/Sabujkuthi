import { business } from './business.mjs';

export const HERO_SETTINGS_KEY = 'homepage_hero_settings';

export const defaultHeroSettings = {
  announcementText: '',
  announcementVisible: true,
  heroImages: [],
  belowTickerText: `${business.name} · ${business.address}  |  Call / WhatsApp: ${business.phoneDisplay}`,
  endTickerText: '🌿 Since plants are delicate and require careful selection and packing from the field, please allow 4–5 days for us to prepare your order.',
};

export function validateHeroSettings(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid hero settings.');

  const announcementText = typeof input.announcementText === 'string' ? input.announcementText.trim().slice(0, 500) : '';
  const announcementVisible = Boolean(input.announcementVisible !== false);

  let heroImages = Array.isArray(input.heroImages) ? input.heroImages : [];
  heroImages = heroImages
    .map(url => (typeof url === 'string' ? url.trim() : ''))
    .filter(url => /^https?:\/\/[^\s]+$/.test(url))
    .slice(0, 5);

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
