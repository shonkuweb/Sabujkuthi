"use client";

import Link from "next/link";
import { Fragment } from "react";
import ShopByCategory from "./ShopByCategory";
import ProductCard from "./ProductCard";
import styles from "./CategoryCatalog.module.css";

export default function CategoryCatalog({ categories, products, loading, error, categorySlug, searchQuery = "" }) {
  const visible = categories.filter(category => category.isVisible !== false);
  const current = categorySlug ? visible.find(category => category.slug === categorySlug) : null;
  if (loading) return <div id="shop" className={styles.message} role="status">Loading plants…</div>;
  if (error) return <div id="shop" className={styles.message} role="alert">Unable to load products. Please refresh to try again.</div>;
  if (categorySlug && !current) return <section id="shop" className={styles.message}><h1>Category unavailable</h1><Link href="/">Back to store</Link></section>;
  const matchingProducts = products.filter(product => product.title.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  const sections = current ? [current] : visible;
  return (
    <div id="shop" className={styles.catalog}>
      {current && <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>{current.name}</span></nav>}
      {!sections.length && <p className={styles.message}>No products available yet.</p>}
      {searchQuery && !matchingProducts.length && <p className={styles.message}>No plants match your search.</p>}
      {sections.map((category, index) => {
        const all = matchingProducts.filter(product => product.categoryId === category.id);
        if (searchQuery && !all.length) return null;
        const items = current ? all : all.slice(0, 4);
        return <Fragment key={category.id}><section className={styles.section} aria-labelledby={`heading-${category.id}`}>
          <div className={styles.heading}>
            {current ? <h1 id={`heading-${category.id}`}>{category.name}</h1> : <h2 id={`heading-${category.id}`}>{category.name}</h2>}
            {!current && <Link href={`/category/${category.slug}`} aria-label={`View all ${category.name}`}>View all</Link>}
          </div>
          {current && <p className={styles.count}>{all.length} {all.length === 1 ? "product" : "products"}</p>}
          {items.length ? <div className={styles.grid}>{items.map(product => <ProductCard key={product.id} product={product} />)}</div> : <p className={styles.empty}>No products in this category yet.</p>}
        </section>
        {!current && !searchQuery && index === Math.min(1, sections.length - 1) && <ShopByCategory categories={visible} products={products} />}
        </Fragment>;
      })}
    </div>
  );
}
