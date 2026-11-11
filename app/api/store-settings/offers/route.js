import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';
import { DEFAULT_OFFERS_SETTINGS, validateOffersSettings } from '../../../../lib/discounts.mjs';

export const dynamic = 'force-dynamic';

const OFFERS_SETTINGS_KEY = 'offers_settings';
const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  try {
    const record = await prisma.settings.findUnique({ where: { key: OFFERS_SETTINGS_KEY } });
    if (!record?.value) {
      return json(DEFAULT_OFFERS_SETTINGS);
    }
    const parsed = JSON.parse(record.value);
    const { settings } = validateOffersSettings(parsed);
    return json(settings || DEFAULT_OFFERS_SETTINGS);
  } catch {
    return json(DEFAULT_OFFERS_SETTINGS);
  }
}

export async function PUT(request) {
  if (!await isAdminRequest(request)) {
    return json({ error: 'Sign in to configure offers and discounts.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload.' }, 400);
  }

  const { valid, settings, error } = validateOffersSettings(body);
  if (!valid) {
    return json({ error: error || 'Invalid offers settings.' }, 400);
  }

  try {
    await prisma.settings.upsert({
      where: { key: OFFERS_SETTINGS_KEY },
      create: { key: OFFERS_SETTINGS_KEY, value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
    return json(settings);
  } catch {
    return json({ error: 'Unable to save offers settings.' }, 500);
  }
}
