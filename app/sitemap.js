import { prisma } from '../lib/prisma';
import { siteUrl } from '../lib/business.mjs';

export default async function sitemap() {
  const baseUrl = siteUrl;

  let productUrls = [];
  try {
    const products = await prisma.product.findMany({
      where: { isPublished: true, category: { is: { isVisible: true } } },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    productUrls = products.map((product) => ({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    }));
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  const staticUrls = [
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/collection`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  return [...staticUrls, ...productUrls];
}
