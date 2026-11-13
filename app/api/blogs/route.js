import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../../lib/prisma';
import { isAdminRequest } from '../../../lib/admin-session.mjs';
import { uploadDataUrlToR2 } from '../../../lib/r2.mjs';

export const dynamic = 'force-dynamic';

const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request) {
  const url = new URL(request.url);
  const admin = url.searchParams.get('admin') === '1';

  if (admin && !await isAdminRequest(request)) {
    return json({ error: 'Please log in to manage blogs.' }, 401);
  }

  try {
    const blogs = await prisma.blogPost.findMany({
      where: admin ? {} : { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
    return json(blogs);
  } catch (error) {
    return json({ error: 'Unable to load blog posts.' }, 500);
  }
}

export async function POST(request) {
  if (!await isAdminRequest(request)) {
    return json({ error: 'Please log in to create blog posts.' }, 401);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid blog data.' }, 400);
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title || title.length > 250) {
    return json({ error: 'Enter a blog title between 1 and 250 characters.' }, 400);
  }

  const content = typeof data.content === 'string' ? data.content.trim() : '';
  if (!content) {
    return json({ error: 'Blog content cannot be empty.' }, 400);
  }

  const baseSlug = (typeof data.slug === 'string' && data.slug.trim())
    ? data.slug.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
    : title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'blog';

  let finalSlug = baseSlug;
  const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
  if (existing) {
    finalSlug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
  }

  let coverImage = typeof data.coverImage === 'string' ? data.coverImage.trim() : null;
  if (coverImage && coverImage.startsWith('data:image/')) {
    try {
      coverImage = await uploadDataUrlToR2(coverImage, 'SabujKuthi/blogs', finalSlug);
    } catch (err) {
      console.warn('R2 upload failed for blog cover image:', err);
    }
  }

  const excerpt = typeof data.excerpt === 'string' && data.excerpt.trim()
    ? data.excerpt.trim().slice(0, 500)
    : content.slice(0, 220).replace(/\n+/g, ' ') + '...';

  const category = typeof data.category === 'string' && data.category.trim()
    ? data.category.trim().slice(0, 60)
    : 'Plant Care';

  const author = typeof data.author === 'string' && data.author.trim()
    ? data.author.trim().slice(0, 80)
    : 'SabujKuthi Nursery';

  const isPublished = Boolean(data.isPublished !== false);

  try {
    const blog = await prisma.blogPost.create({
      data: {
        id: randomUUID(),
        slug: finalSlug,
        title,
        excerpt,
        content,
        coverImage,
        category,
        author,
        isPublished,
      },
    });
    return json(blog, 201);
  } catch (error) {
    return json({ error: 'Unable to save blog post. Please try again.' }, 500);
  }
}

export async function PUT(request) {
  if (!await isAdminRequest(request)) {
    return json({ error: 'Please log in to edit blog posts.' }, 401);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid blog data.' }, 400);
  }

  const id = typeof data.id === 'string' ? data.id.trim() : '';
  if (!id) return json({ error: 'Blog ID is required.' }, 400);

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return json({ error: 'Blog post not found.' }, 404);

  const title = typeof data.title === 'string' ? data.title.trim() : existing.title;
  if (!title || title.length > 250) {
    return json({ error: 'Enter a blog title between 1 and 250 characters.' }, 400);
  }

  const content = typeof data.content === 'string' ? data.content.trim() : existing.content;
  if (!content) {
    return json({ error: 'Blog content cannot be empty.' }, 400);
  }

  let coverImage = typeof data.coverImage === 'string' ? data.coverImage.trim() : existing.coverImage;
  if (coverImage && coverImage.startsWith('data:image/')) {
    try {
      coverImage = await uploadDataUrlToR2(coverImage, 'SabujKuthi/blogs', existing.slug);
    } catch (err) {
      console.warn('R2 upload failed for blog cover image:', err);
    }
  }

  const excerpt = typeof data.excerpt === 'string' && data.excerpt.trim()
    ? data.excerpt.trim().slice(0, 500)
    : (data.excerpt === '' ? null : existing.excerpt);

  const category = typeof data.category === 'string' && data.category.trim()
    ? data.category.trim().slice(0, 60)
    : existing.category;

  const author = typeof data.author === 'string' && data.author.trim()
    ? data.author.trim().slice(0, 80)
    : existing.author;

  const isPublished = data.isPublished !== undefined ? Boolean(data.isPublished) : existing.isPublished;

  try {
    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        title,
        excerpt,
        content,
        coverImage,
        category,
        author,
        isPublished,
      },
    });
    return json(updated);
  } catch (error) {
    return json({ error: 'Unable to update blog post.' }, 500);
  }
}

export async function DELETE(request) {
  if (!await isAdminRequest(request)) {
    return json({ error: 'Please log in to delete blog posts.' }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'Blog ID is required.' }, 400);

  try {
    await prisma.blogPost.delete({ where: { id } });
    return json({ success: true });
  } catch (error) {
    return json({ error: error.code === 'P2025' ? 'Blog post not found.' : 'Unable to delete blog post.' }, error.code === 'P2025' ? 404 : 500);
  }
}
