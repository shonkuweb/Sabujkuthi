import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';
import { HERO_SETTINGS_KEY, defaultHeroSettings, getStoredHeroSettings, validateHeroSettings } from '../../../../lib/hero-settings.mjs';

export const dynamic = 'force-dynamic';

const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  try {
    const settings = await getStoredHeroSettings(prisma);
    return json(settings);
  } catch {
    return json(defaultHeroSettings);
  }
}

export async function PUT(request) {
  if (!await isAdminRequest(request)) {
    return json({ error: 'Sign in to configure hero settings.' }, 401);
  }

  let settings;
  try {
    settings = validateHeroSettings(await request.json());
  } catch (error) {
    return json({ error: error.message || 'Invalid hero settings.' }, 400);
  }

  try {
    await prisma.settings.upsert({
      where: { key: HERO_SETTINGS_KEY },
      create: { key: HERO_SETTINGS_KEY, value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
    return json(settings);
  } catch {
    return json({ error: 'Unable to save hero settings.' }, 500);
  }
}
