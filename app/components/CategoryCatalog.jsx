"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import ShopByCategory from "./ShopByCategory";
import ProductCard from "./ProductCard";
import { getCategoryAndDescendantIds, getCategoryPath } from "../../lib/category-tree.mjs";
import styles from "./CategoryCatalog.module.css";

export default function CategoryCatalog({ categories, products, loading, error, categorySlug, searchQuery = "" }) {
  const [activeSubcatId, setActiveSubcatId] = useState(null);

  const visible = categories.filter(category => category.isVisible !== false);
  const current = categorySlug ? visible.find(category => category.slug === categorySlug) : null;

  if (loading) return <div id="shop" className={styles.message} role="status">Loading plants…</div>;
  if (error) return <div id="shop" className={styles.message} role="alert">Unable to load products. Please refresh to try again.</div>;
  if (categorySlug && !current) return <section id="shop" className={styles.message}><h1>Category unavailable</h1><Link href="/">Back to store</Link></section>;

  const matchingProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Check if current category has child subcategories
  const childCategories = current ? visible.filter(c => c.parentId === current.id) : [];
  const breadcrumbPath = current ? getCategoryPath(current.id, categories) : [];

  const gridCategories = visible.filter(category => category.isVisibleInGrid !== false && !category.parentId);
  const sections = current ? [current] : gridCategories;
  const shopCategories = visible.filter(category => category.isVisibleInShopBy !== false);
  const showShopByCategory = !current && !searchQuery && shopCategories.length > 0;

  return (
    <div id="shop" className={styles.catalog}>
      {current && (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          {breadcrumbPath.map((item, index) => {
            const isLast = index === breadcrumbPath.length - 1;
            return isLast ? (
              <span key={item.id}>{item.name}</span>
            ) : (
              <Fragment key={item.id}>
                <Link href={`/category/${item.slug}`}>{item.name}</Link>
                <span>/</span>
              </Fragment>
            );
          })}
        </nav>
      )}

      {/* Subcategory Pills Bar (if category has child categories) */}
      {current && childCategories.length > 0 && (
        <div className={styles.subcatBar} role="tablist" aria-label="Subcategories">
          <button
            type="button"
            role="tab"
            aria-selected={!activeSubcatId}
            className={`${styles.subcatPill} ${!activeSubcatId ? styles.subcatPillActive : ""}`}
            onClick={() => setActiveSubcatId(null)}
          >
            All {current.name}
          </button>
          {childCategories.map((subcat) => (
            <button
              key={subcat.id}
              type="button"
              role="tab"
              aria-selected={activeSubcatId === subcat.id}
              className={`${styles.subcatPill} ${activeSubcatId === subcat.id ? styles.subcatPillActive : ""}`}
              onClick={() => setActiveSubcatId(activeSubcatId === subcat.id ? null : subcat.id)}
            >
              {subcat.name}
            </button>
          ))}
        </div>
      )}

      {!sections.length && !showShopByCategory && <p className={styles.message}>No products available yet.</p>}
      {searchQuery && !matchingProducts.length && <p className={styles.message}>No plants match your search.</p>}
      {sections.length === 0 && showShopByCategory && <ShopByCategory categories={shopCategories} products={products} />}

      {sections.map((category, index) => {
        // Multi-category product matching:
        // If an active subcategory pill is chosen, only match that subcategory!
        // Otherwise, match this category AND all its descendant subcategories!
        const targetCategoryIds = current && activeSubcatId
          ? [activeSubcatId]
          : current
          ? getCategoryAndDescendantIds(category.id, categories)
          : [category.id];

        const all = matchingProducts.filter(product => {
          const productCats = Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId].filter(Boolean);
          return targetCategoryIds.some(id => productCats.includes(id));
        });

        if (searchQuery && !all.length) return null;
        const items = current ? all : all.slice(0, 8);

        return (
          <Fragment key={category.id}>
            <section className={styles.section} aria-labelledby={`heading-${category.id}`}>
              <div className={styles.heading}>
                {current ? <h1 id={`heading-${category.id}`}>{category.name}</h1> : <h2 id={`heading-${category.id}`}>{category.name}</h2>}
                {!current && <Link href={`/category/${category.slug}`} aria-label={`View all ${category.name}`}>View all</Link>}
              </div>
              {current && <p className={styles.count}>{all.length} {all.length === 1 ? "product" : "products"}</p>}
              {items.length ? (
                <div className={styles.grid}>
                  {items.map(product => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <p className={styles.empty}>No products in this category yet.</p>
              )}
            </section>
            {showShopByCategory && index === Math.min(1, sections.length - 1) && (
              <ShopByCategory categories={shopCategories} products={products} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
