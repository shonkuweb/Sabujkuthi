import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma';
import { isAdminRequest } from '../../../lib/admin-session.mjs';
import { uploadDataUrlToR2 } from '../../../lib/r2.mjs';

export const dynamic = 'force-dynamic';

async function unauthorized(request) { return !await isAdminRequest(request); }

function validate(data) {
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 80) {
    return 'Enter a category name between 1 and 80 characters.';
  }
  if (data.isVisible != null && typeof data.isVisible !== 'boolean') return 'Visibility must be enabled or disabled.';
  if (data.isVisibleInNav != null && typeof data.isVisibleInNav !== 'boolean') return 'Navbar visibility must be enabled or disabled.';
  if (data.isVisibleInGrid != null && typeof data.isVisibleInGrid !== 'boolean') return 'Product grid visibility must be enabled or disabled.';
  if (data.isVisibleInShopBy != null && typeof data.isVisibleInShopBy !== 'boolean') return 'Shop By Category visibility must be enabled or disabled.';
  if (data.image != null && typeof data.image !== 'string') return 'Invalid thumbnail.';
  if (data.image) {
    if (data.image.length > 1400000) return 'Thumbnail is too large. Choose a smaller image.';
    const embeddedImage = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data.image);
    let remoteImage = false;
    try { remoteImage = ['http:', 'https:'].includes(new URL(data.image).protocol); } catch {}
    if (!embeddedImage && !remoteImage) return 'Use a JPG, PNG or WebP thumbnail.';
  }
  return null;
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(categories.map(({ nameKey, ...category }) => category));
  } catch {
    return NextResponse.json({ error: 'Unable to load categories. Please try again.' }, { status: 500 });
  }
}

async function isDescendant(potentialParentId, targetId, allCategories) {
  let currentId = potentialParentId;
  const visited = new Set();
  while (currentId) {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const current = allCategories.find(c => c.id === currentId);
    currentId = current?.parentId || null;
  }
  return false;
}

async function saveCategory(request, isUpdate) {
  if (await unauthorized(request)) return NextResponse.json({ error: 'Please log in to manage categories.' }, { status: 401 });
  let data;
  try { data = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid category data.' }, { status: 400 });
  }
  if (!data || typeof data !== 'object') return NextResponse.json({ error: 'Invalid category data.' }, { status: 400 });
  const error = validate(data);
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const categories = await prisma.category.findMany();
    const index = isUpdate ? categories.findIndex(category => String(category.id) === String(data.id)) : -1;
    if (isUpdate && index === -1) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    const id = isUpdate ? categories[index].id : randomUUID();

    // Validate parentId if provided
    let parentId = null;
    if (data.parentId && typeof data.parentId === 'string' && data.parentId.trim()) {
      parentId = data.parentId.trim();
      if (parentId === id) {
        return NextResponse.json({ error: 'A category cannot be its own parent.' }, { status: 400 });
      }
      const parentExists = categories.some(c => c.id === parentId);
      if (!parentExists) {
        return NextResponse.json({ error: 'The selected parent category does not exist.' }, { status: 400 });
      }
      if (isUpdate && await isDescendant(parentId, id, categories)) {
        return NextResponse.json({ error: 'A category cannot be a subcategory of its own child or descendant.' }, { status: 400 });
      }
    }

    const name = data.name.trim();
    const isDuplicate = categories.some((category, position) =>
      position !== index &&
      (category.parentId || null) === parentId &&
      category.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (isDuplicate) {
      return NextResponse.json({
        error: parentId ? 'A subcategory with this name already exists under this parent.' : 'A top-level category with this name already exists.'
      }, { status: 409 });
    }

    const baseSlug = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'category';
    const slug = isUpdate ? categories[index].slug : `${baseSlug}-${id.slice(0, 8)}`;
    let imageUrl = data.image || '';
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      try {
        imageUrl = await uploadDataUrlToR2(imageUrl, 'SabujKuthi/categories', baseSlug);
      } catch (err) {
        console.warn('R2 upload failed, preserving provided image:', err);
      }
    }
    const isVisibleInNav = data.isVisibleInNav !== undefined ? Boolean(data.isVisibleInNav) : (isUpdate && categories[index].isVisibleInNav !== undefined ? categories[index].isVisibleInNav : true);
    const isVisibleInGrid = data.isVisibleInGrid !== undefined ? Boolean(data.isVisibleInGrid) : (isUpdate && categories[index].isVisibleInGrid !== undefined ? categories[index].isVisibleInGrid : true);
    const isVisibleInShopBy = data.isVisibleInShopBy !== undefined ? Boolean(data.isVisibleInShopBy) : (isUpdate && categories[index].isVisibleInShopBy !== undefined ? categories[index].isVisibleInShopBy : true);
    const isVisible = data.isVisible !== undefined ? Boolean(data.isVisible) : (isVisibleInNav || isVisibleInGrid || isVisibleInShopBy);
    const order = typeof data.order === 'number' && Number.isFinite(data.order) ? Math.floor(data.order) : (isUpdate && categories[index].order !== undefined ? categories[index].order : 0);

    const category = {
      ...(isUpdate ? categories[index] : {}),
      id, slug, name,
      parentId,
      order,
      image: imageUrl,
      isVisible,
      isVisibleInNav,
      isVisibleInGrid,
      isVisibleInShopBy,
    };
    const nameKey = parentId ? `${name.toLocaleLowerCase()}__${parentId}` : name.toLocaleLowerCase();
    const storedCategory = { ...category, nameKey };
    if (isUpdate) await prisma.category.update({ where: { id }, data: storedCategory });
    else await prisma.category.create({ data: storedCategory });
    return NextResponse.json({ category }, { status: isUpdate ? 200 : 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to save the category. Please try again.' }, { status: 500 });
  }
}

export async function POST(request) { return saveCategory(request, false); }
export async function PUT(request) { return saveCategory(request, true); }

export async function DELETE(request) {
  if (await unauthorized(request)) return NextResponse.json({ error: 'Please log in to manage categories.' }, { status: 401 });
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const id = url.searchParams.get('id');
  if (!slug && !id) return NextResponse.json({ error: 'Category slug or ID is required.' }, { status: 400 });
  try {
    const category = id
      ? await prisma.category.findUnique({ where: { id } })
      : await prisma.category.findUnique({ where: { slug } });
    if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });

    // Reparent any child categories to the deleted category's parent
    await prisma.category.updateMany({
      where: { parentId: category.id },
      data: { parentId: category.parentId || null },
    });

    // Remove join table entries
    await prisma.productCategory.deleteMany({
      where: { categoryId: category.id },
    });

    await prisma.category.delete({ where: { id: category.id } });
    return NextResponse.json({ message: 'Category deleted.' });
  } catch (error) {
    return NextResponse.json({ error: error.code === 'P2025' ? 'Category not found.' : 'Unable to delete category.' }, { status: error.code === 'P2025' ? 404 : 500 });
  }
}
