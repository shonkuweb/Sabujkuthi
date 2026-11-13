import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';
import { NAVBAR_SETTINGS_KEY, defaultNavbarSettings, validateNavbarSettings } from '../../../../lib/navbar-settings.mjs';

export const dynamic = 'force-dynamic';

const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  try {
    const record = await prisma.settings.findUnique({ where: { key: NAVBAR_SETTINGS_KEY } });
    if (!record?.value) {
      return json(defaultNavbarSettings);
    }
    const parsed = JSON.parse(record.value);
    const { settings } = validateNavbarSettings(parsed);
    return json(settings || defaultNavbarSettings);
  } catch {
    return json(defaultNavbarSettings);
  }
}

export async function PUT(request) {
  if (!await isAdminRequest(request)) {
    return json({ error: 'Sign in to configure navbar settings.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload.' }, 400);
  }

  const { valid, settings, error } = validateNavbarSettings(body);
  if (!valid) {
    return json({ error: error || 'Invalid navbar settings.' }, 400);
  }

  try {
    await prisma.settings.upsert({
      where: { key: NAVBAR_SETTINGS_KEY },
      create: { key: NAVBAR_SETTINGS_KEY, value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
    return json(settings);
  } catch {
    return json({ error: 'Unable to save navbar settings. Please try again.' }, 500);
  }
}
