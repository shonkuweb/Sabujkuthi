import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const body = await request.json().catch(() => ({}));
    const isNewVisitor = Boolean(body?.newVisitor);

    await prisma.siteVisit.upsert({
      where: { date: today },
      create: {
        id: randomUUID(),
        date: today,
        count: 1,
        uniqueVisitors: isNewVisitor ? 1 : 1,
      },
      update: {
        count: { increment: 1 },
        ...(isNewVisitor ? { uniqueVisitors: { increment: 1 } } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // Never block client
  }
}
