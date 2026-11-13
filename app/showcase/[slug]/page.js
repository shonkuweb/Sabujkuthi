"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { FaLeaf } from "react-icons/fa";
import { FiChevronRight, FiPackage } from "react-icons/fi";
import ProductCard from "../../components/ProductCard";
import { useCart } from "../../context/CartContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import styles from "./page.module.css";

export default function ShowcasePage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || "";
  const { products, productsLoading } = useCart();
  const { navbarSettings } = useStoreSettings();

  const config = useMemo(() => {
    const item = navbarSettings?.items?.find(
      (i) => i.id === slug || i.href === `/showcase/${slug}` || i.href === `/${slug}`
    );
    if (item) return item;

    const formattedTitle = slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      id: slug,
      label: formattedTitle || "Collection Showcase",
      description: "Explore our specially curated nursery selections, fresh saplings, and essentials.",
      productIds: [],
    };
  }, [navbarSettings, slug]);

  const displayProducts = useMemo(() => {
    if (!products || !products.length) return [];
    if (config.productIds && config.productIds.length > 0) {
      return config.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean);
    }
    return [];
  }, [products, config]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <FiChevronRight aria-hidden="true" />
          <span>{config.label}</span>
        </nav>

        {/* Hero Banner */}
        <header className={styles.hero}>
          <div className={styles.badge}>
            <FaLeaf aria-hidden="true" />
            <span>Nursery Showcase</span>
          </div>
          <h1 className={styles.title}>{config.label}</h1>
          <p className={styles.description}>
            {config.description ||
              "Explore our handpicked collection of plants, saplings, organic fertilizers, and garden accessories."}
          </p>
        </header>

        {/* Meta Bar */}
        <div className={styles.metaRow}>
          <span className={styles.count}>
            {productsLoading
              ? "Loading products..."
              : `Showing ${displayProducts.length} ${displayProducts.length === 1 ? "Product" : "Products"}`}
          </span>
        </div>

        {/* Product Grid */}
        {productsLoading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#6a7c71" }}>
            Loading collection...
          </p>
        ) : displayProducts.length === 0 ? (
          <div className={styles.empty}>
            <FiPackage style={{ width: 44, height: 44, color: "#8da595" }} />
            <h3>No Products in this Showcase Yet</h3>
            <p>Products are being added to this showcase. Explore our complete nursery inventory below.</p>
            <Link href="/collection" className={styles.ctaBtn}>
              Browse All Plants
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
