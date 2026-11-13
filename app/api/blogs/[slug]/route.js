import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request, { params }) {
  const { slug } = await params;
  if (!slug) return json({ error: 'Slug is required.' }, 400);

  try {
    const blog = await prisma.blogPost.findUnique({
      where: { slug },
    });
    if (!blog || !blog.isPublished) {
      return json({ error: 'Blog post not found.' }, 404);
    }
    return json(blog);
  } catch (error) {
    return json({ error: 'Unable to load blog post.' }, 500);
  }
}
