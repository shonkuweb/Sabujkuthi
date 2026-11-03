import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';
import { DELIVERY_SETTINGS_KEY, defaultDeliverySettings, getStoredDeliverySettings, validateDeliverySettings } from '../../../../lib/delivery-settings.mjs';

export const dynamic = 'force-dynamic';

const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  try {
    const settings = await getStoredDeliverySettings(prisma);
    return json(settings);
  } catch {
    return json(defaultDeliverySettings);
  }
}

export async function PUT(request) {
  if (!await isAdminRequest(request)) {
    return json({ error: 'Sign in to configure delivery settings.' }, 401);
  }

  let settings;
  try {
    settings = validateDeliverySettings(await request.json());
  } catch (error) {
    return json({ error: error.message || 'Invalid delivery settings.' }, 400);
  }

  try {
    await prisma.settings.upsert({
      where: { key: DELIVERY_SETTINGS_KEY },
      create: { key: DELIVERY_SETTINGS_KEY, value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
    return json(settings);
  } catch {
    return json({ error: 'Unable to save delivery settings.' }, 500);
  }
}
