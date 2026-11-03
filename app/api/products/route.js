import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma';
import { isAdminRequest } from '../../../lib/admin-session.mjs';
import { uploadDataUrlToR2 } from '../../../lib/r2.mjs';

export const dynamic = 'force-dynamic';
const authorized = isAdminRequest;
const money = value => typeof value === 'string' && /^\d+(\.\d{1,2})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) <= 10000000;

function publicProduct(product) {
  let adeniumOptions = null;
  try { adeniumOptions = product.adeniumOptions ? JSON.parse(product.adeniumOptions) : null; } catch {}
  return { ...product, adeniumOptions };
}

export async function GET(request) {
  const admin = new URL(request.url).searchParams.get('admin') === '1';
  if (admin && !await authorized(request)) return NextResponse.json({ error: 'Please log in to view inventory.' }, { status: 401 });
  try {
    const products = await prisma.product.findMany({
      where: admin ? {} : { isPublished: true, category: { is: { isVisible: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products.map(publicProduct));
  } catch {
    return NextResponse.json({ error: 'Unable to load products.' }, { status: 500 });
  }
}

async function save(request, update) {
  if (!await authorized(request)) return NextResponse.json({ error: 'Please log in to manage products.' }, { status: 401 });
  let data;
  try { data = await request.json(); } catch { return NextResponse.json({ error: 'Invalid product data.' }, { status: 400 }); }
  if (!data || typeof data !== 'object') return NextResponse.json({ error: 'Invalid product data.' }, { status: 400 });
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 120) return NextResponse.json({ error: 'Enter a product name between 1 and 120 characters.' }, { status: 400 });
  if (!money(String(data.price ?? ''))) return NextResponse.json({ error: 'Enter a valid price with up to two decimal places.' }, { status: 400 });
  if (data.oldPrice != null && data.oldPrice !== '' && (!money(String(data.oldPrice)) || Number(data.oldPrice) <= Number(data.price))) return NextResponse.json({ error: 'Original price must be greater than the selling price.' }, { status: 400 });
  if (typeof data.categoryId !== 'string' || !data.categoryId) return NextResponse.json({ error: 'Choose a category.' }, { status: 400 });
  if (data.inStock != null && typeof data.inStock !== 'boolean') return NextResponse.json({ error: 'Invalid stock status.' }, { status: 400 });
  if (data.isPublished != null && typeof data.isPublished !== 'boolean') return NextResponse.json({ error: 'Invalid publication status.' }, { status: 400 });
  if (data.description != null && (typeof data.description !== 'string' || data.description.length > 10000)) return NextResponse.json({ error: 'Description must be under 10,000 characters.' }, { status: 400 });
  if (data.image != null && (typeof data.image !== 'string' || data.image.length > 1400000 || (data.image && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data.image) && !/^https?:\/\/[^\s]+$/.test(data.image)))) return NextResponse.json({ error: 'Choose a valid JPG, PNG or WebP image.' }, { status: 400 });
  const detailFields = ['plantCare', 'deliveryReturns', 'deliveryNote', 'deliveryPincodes', 'replacementInfo', 'deliveryInfo', 'supportInfo', 'packagingInfo'];
  for (const key of detailFields) {
    if (data[key] != null && (typeof data[key] !== 'string' || data[key].length > 10000)) return NextResponse.json({ error: 'Product detail fields must be text under 10,000 characters.' }, { status: 400 });
  }
  if (data.deliveryPincodes && !/^\s*[1-9]\d{5}(?:\s*,\s*[1-9]\d{5})*\s*$/.test(data.deliveryPincodes)) return NextResponse.json({ error: 'Enter six-digit delivery pincodes separated by commas.' }, { status: 400 });
  if (data.soldLast24Hours != null && data.soldLast24Hours !== '' && (!Number.isInteger(Number(data.soldLast24Hours)) || Number(data.soldLast24Hours) < 0 || Number(data.soldLast24Hours) > 1000000)) return NextResponse.json({ error: 'Enter a valid sold count, or leave it blank.' }, { status: 400 });
  if (data.demoMetrics != null && typeof data.demoMetrics !== 'boolean') return NextResponse.json({ error: 'Invalid demo statistics setting.' }, { status: 400 });
  try {
    if (!await prisma.category.findUnique({ where: { id: data.categoryId } })) return NextResponse.json({ error: 'This category no longer exists. Choose another category.' }, { status: 400 });
    const existing = update && typeof data.id === 'string' ? await prisma.product.findUnique({ where: { id: data.id } }) : null;
    if (update && !existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const id = existing?.id || randomUUID();
    const title = data.title.trim();
    const baseSlug = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'product';
    let imageUrl = data.image || null;
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        imageUrl = await uploadDataUrlToR2(imageUrl, 'SabujKuthi/products', baseSlug);
      } catch (err) {
        console.warn('R2 upload failed, preserving provided image:', err);
      }
    }
    const fields = {
      title, categoryId: data.categoryId, price: String(Number(data.price)),
      oldPrice: data.oldPrice ? String(Number(data.oldPrice)) : null,
      description: data.description?.trim() || null, image: imageUrl,
      inStock: data.inStock !== false, isPublished: data.isPublished !== false,
    };
    for (const key of detailFields) {
      fields[key] = data[key] === undefined && existing ? existing[key] : data[key]?.trim() || null;
    }
    fields.soldLast24Hours = data.soldLast24Hours === undefined && existing ? existing.soldLast24Hours : data.soldLast24Hours == null || data.soldLast24Hours === '' ? null : Number(data.soldLast24Hours);
    fields.demoMetrics = data.demoMetrics ?? existing?.demoMetrics ?? true;
    const product = update
      ? await prisma.product.update({ where: { id }, data: fields })
      : await prisma.product.create({ data: { id, slug: `${baseSlug}-${id.slice(0, 8)}`, rating: 0, reviews: 0, ...fields } });
    return NextResponse.json({ product: publicProduct(product) }, { status: update ? 200 : 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to save product. Please try again.' }, { status: 500 });
  }
}

export async function POST(request) { return save(request, false); }
export async function PUT(request) { return save(request, true); }
export async function DELETE(request) {
  if (!await authorized(request)) return NextResponse.json({ error: 'Please log in to manage products.' }, { status: 401 });
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');
  if (!slug && !id) return NextResponse.json({ error: 'Product slug or ID is required.' }, { status: 400 });
  try {
    if (id) await prisma.product.delete({ where: { id } });
    else await prisma.product.delete({ where: { slug } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.code === 'P2025' ? 'Product not found.' : 'Unable to delete product.' }, { status: error.code === 'P2025' ? 404 : 500 });
  }
}
