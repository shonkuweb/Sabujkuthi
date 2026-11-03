import { prisma } from "../../../lib/prisma";
import { business, siteUrl } from "../../../lib/business.mjs";

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const product = await prisma.product.findFirst({
      where: { slug, isPublished: true, category: { is: { isVisible: true } } }
    });

    if (!product) {
      return {
        title: "Product Not Found",
        description: `Explore plants at ${business.name}.`
      };
    }

    const title = `${product.title} | ${business.name}`;
    const description = product.description ? product.description.slice(0, 160) : `View ${product.title} at ${business.name}.`;

    const ogImages = [product.image, product.image2].filter(Boolean).map(url => ({ url, alt: `${business.name} - ${product.title}` }));
    return {
      title: { absolute: title },
      description,
      keywords: [
        product.title,
        `buy ${product.title} online`,
        `${product.title} wholesale nursery`,
        `${product.title} price`,
        business.name,
        "nursery plant",
        `${business.locality} plant nursery`
      ],
      alternates: {
        canonical: `${siteUrl}/product/${slug}`
      },
      openGraph: {
        title,
        description,
        url: `${siteUrl}/product/${slug}`,
        siteName: business.name,
        images: ogImages,
        type: "article"
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImages.map(img => img.url)
      }
    };
  } catch (error) {
    return {
      title: "Plants",
      description: `Shop plants from ${business.name}, ${business.address}.`
    };
  }
}

export default async function ProductLayout({ children, params }) {
  const { slug } = await params;
  let productJsonLd = null;

  try {
    const product = await prisma.product.findFirst({
      where: { slug, isPublished: true, category: { is: { isVisible: true } } }
    });

    if (product) {
      productJsonLd = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title,
        "image": [product.image, product.image2].filter(Boolean),
        ...(product.description ? { description: product.description } : {}),
        "sku": product.id,
        "brand": {
          "@type": "Brand",
          "name": business.name
        },
        "offers": {
          "@type": "Offer",
          "url": `${siteUrl}/product/${product.slug}`,
          "priceCurrency": "INR",
          "price": product.price,
          "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": business.name
          }
        },
        ...(!product.demoMetrics && product.rating > 0 && product.reviews > 0 ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews }
        } : {})
      };
    }
  } catch (e) {
    // Ignore schema build error
  }

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  );
}
