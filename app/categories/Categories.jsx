"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FaLeaf } from "react-icons/fa";
import { FiArrowRight, FiSearch, FiX, FiLayers } from "react-icons/fi";
import { useCategoryCatalog } from "../hooks/useCategories";
import { useCart } from "../context/CartContext";
import {
  buildCategoryTree,
  getCategoryAndDescendantIds,
} from "../../lib/category-tree.mjs";
import styles from "./page.module.css";

function getProductCategoryIds(product) {
  if (Array.isArray(product.categoryIds)) return product.categoryIds;
  if (typeof product.categoryIds === "string") {
    try {
      const parsed = JSON.parse(product.categoryIds);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return product.categoryId ? [product.categoryId] : [];
}

export default function Categories() {
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategoryCatalog();
  const { products, productsLoading, productsError } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewTab, setViewTab] = useState("main"); // "main" | "all"

  const loading = categoriesLoading || productsLoading;
  const error = categoriesError || productsError;

  const visible = useMemo(
    () => categories.filter((category) => category.isVisible !== false),
    [categories]
  );

  const publishedProducts = useMemo(
    () => products.filter((p) => p.isPublished !== false),
    [products]
  );

  // Map category ID to its matching product count (including descendants)
  const categoryProductCounts = useMemo(() => {
    const counts = {};
    for (const cat of visible) {
      const allIds = new Set(getCategoryAndDescendantIds(cat.id, visible));
      counts[cat.id] = publishedProducts.filter((p) =>
        getProductCategoryIds(p).some((id) => allIds.has(id))
      ).length;
    }
    return counts;
  }, [visible, publishedProducts]);

  // Root categories (top-level)
  const rootCategories = useMemo(
    () => visible.filter((cat) => !cat.parentId),
    [visible]
  );

  // Group child categories by their parentId
  const childrenByParentId = useMemo(() => {
    const map = {};
    for (const cat of visible) {
      if (cat.parentId) {
        if (!map[cat.parentId]) map[cat.parentId] = [];
        map[cat.parentId].push(cat);
      }
    }
    return map;
  }, [visible]);

  // Map category ID to category object for parent lookup
  const categoryById = useMemo(() => {
    const map = {};
    for (const cat of visible) {
      map[cat.id] = cat;
    }
    return map;
  }, [visible]);

  // Filtered categories based on tab and search
  const displayedCategories = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      // When searching, match any category (root or subcategory)
      return visible.filter((cat) =>
        cat.name.toLowerCase().includes(query)
      );
    }

    if (viewTab === "main") {
      // Fallback to all if no root categories are defined
      return rootCategories.length > 0 ? rootCategories : visible;
    }

    return visible;
  }, [visible, rootCategories, searchTerm, viewTab]);

  return (
    <main className={styles.page}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Categories</span>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.eyebrow}>
            <FaLeaf aria-hidden="true" />
            <span>Explore Collections</span>
          </span>
          <h1 className={styles.title}>Plant Categories</h1>
          <p className={styles.description}>
            Browse our nursery collection by category. Select any category to explore its varieties and view all available plants.
          </p>
        </div>

        {/* Search and Tabs Controls */}
        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <FiSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search plant categories…"
              aria-label="Search plant categories"
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className={styles.clearBtn}
                aria-label="Clear search"
              >
                <FiX aria-hidden="true" />
              </button>
            )}
          </div>

          {!searchTerm && (
            <div className={styles.tabGroup} role="tablist" aria-label="Category views">
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === "main"}
                className={`${styles.tabBtn} ${viewTab === "main" ? styles.tabBtnActive : ""}`}
                onClick={() => setViewTab("main")}
              >
                <FaLeaf aria-hidden="true" />
                <span>Main Categories</span>
                <span className={styles.tabBadge}>{rootCategories.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewTab === "all"}
                className={`${styles.tabBtn} ${viewTab === "all" ? styles.tabBtnActive : ""}`}
                onClick={() => setViewTab("all")}
              >
                <FiLayers aria-hidden="true" />
                <span>All Categories</span>
                <span className={styles.tabBadge}>{visible.length}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className={styles.stateMessage} role="status">
          <h2>Loading categories…</h2>
          <p>Please wait while we fetch the latest plant categories.</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className={styles.stateMessage} role="alert">
          <h2>Unable to load categories</h2>
          <p>We encountered an issue fetching the categories. Please check your connection and refresh the page.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      )}

      {/* Empty States */}
      {!loading && !error && displayedCategories.length === 0 && (
        <div className={styles.stateMessage}>
          {searchTerm ? (
            <>
              <h2>No categories match &quot;{searchTerm}&quot;</h2>
              <p>Try searching with another keyword or explore our main categories.</p>
              <button type="button" onClick={() => setSearchTerm("")}>
                Clear Search
              </button>
            </>
          ) : (
            <>
              <h2>No categories found</h2>
              <p>New plant categories will be published soon. Please check back later.</p>
              <Link href="/" className={styles.tabBtn}>
                Back to Home
              </Link>
            </>
          )}
        </div>
      )}

      {/* Categories Grid */}
      {!loading && !error && displayedCategories.length > 0 && (
        <>
          <div className={styles.metaRow}>
            <span>
              Showing {displayedCategories.length}{" "}
              {displayedCategories.length === 1 ? "category" : "categories"}
            </span>
          </div>

          <div className={styles.grid}>
            {displayedCategories.map((category) => {
              const count = categoryProductCounts[category.id] || 0;
              const children = childrenByParentId[category.id] || [];
              const parent = category.parentId ? categoryById[category.parentId] : null;

              return (
                <article key={category.id} className={styles.card}>
                  <Link
                    href={`/category/${category.slug}`}
                    className={styles.cardImageLink}
                    aria-label={`View plants in ${category.name}`}
                  >
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        loading="lazy"
                        decoding="async"
                        className={styles.cardImage}
                      />
                    ) : (
                      <div className={styles.imageFallback}>
                        <FaLeaf aria-hidden="true" />
                      </div>
                    )}
                  </Link>

                  <div className={styles.cardBody}>
                    <div className={styles.cardHeaderRow}>
                      <Link
                        href={`/category/${category.slug}`}
                        className={styles.categoryTitleLink}
                      >
                        <h2 className={styles.categoryTitle}>{category.name}</h2>
                      </Link>
                      <span className={styles.countBadge}>
                        {count} {count === 1 ? "plant" : "plants"}
                      </span>
                    </div>

                    {/* If viewing a child category directly, show its parent path */}
                    {parent && (
                      <p className={styles.parentNotice}>
                        Under:{" "}
                        <Link href={`/category/${parent.slug}`}>
                          {parent.name}
                        </Link>
                      </p>
                    )}

                    {/* Subcategories list when available */}
                    {children.length > 0 && (
                      <div className={styles.subcatBlock}>
                        <span className={styles.subcatHeading}>Subcategories:</span>
                        <div className={styles.subcatPills}>
                          {children.map((sub) => {
                            const subCount = categoryProductCounts[sub.id] || 0;
                            return (
                              <Link
                                key={sub.id}
                                href={`/category/${sub.slug}`}
                                className={styles.subcatPill}
                                title={`Shop ${sub.name}`}
                              >
                                <span>{sub.name}</span>
                                <span className={styles.subcatCount}>({subCount})</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className={styles.cardFooter}>
                      <Link
                        href={`/category/${category.slug}`}
                        className={styles.viewBtn}
                      >
                        <span>View Products</span>
                        <FiArrowRight aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
