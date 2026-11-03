import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';
import { defaultVideoSection, validateVideoSection } from '../../../../lib/video-section.mjs';
export const dynamic = 'force-dynamic';
const key = 'homepage_video_section';
const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request) {
  const admin = new URL(request.url).searchParams.get('admin') === '1';
  if (admin && !await isAdminRequest(request)) return json({ error: 'Sign in to configure store settings.' }, 401);
  try {
    const saved = await prisma.settings.findUnique({ where: { key } });
    const settings = saved ? validateVideoSection(JSON.parse(saved.value)) : defaultVideoSection;
    if (admin) return json(settings);
    if (!settings.enabled) return json({ ...settings, videos: [] });
    const products = await prisma.product.findMany({ where: { id: { in: settings.videos.map(video => video.productId).filter(Boolean) }, isPublished: true, category: { is: { isVisible: true } } }, select: { id: true, title: true, slug: true, image: true } });
    return json({ ...settings, videos: settings.videos.map(video => ({ ...video, product: products.find(product => product.id === video.productId) || null })) });
  } catch { return json({ error: 'Unable to load the video section.' }, 500); }
}
export async function PUT(request) {
  if (!await isAdminRequest(request)) return json({ error: 'Sign in to configure store settings.' }, 401);
  let settings;
  try { settings = validateVideoSection(await request.json()); } catch (error) { return json({ error: error.message || 'Invalid settings.' }, 400); }
  try {
    const ids = [...new Set(settings.videos.map(video => video.productId).filter(Boolean))];
    if (ids.length && await prisma.product.count({ where: { id: { in: ids } } }) !== ids.length) return json({ error: 'A linked product no longer exists. Choose another product or remove the link.' }, 400);
    await prisma.settings.upsert({ where: { key }, create: { key, value: JSON.stringify(settings) }, update: { value: JSON.stringify(settings) } });
    return json(settings);
  } catch { return json({ error: 'Unable to save the video section.' }, 500); }
}
