"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FaLeaf } from "react-icons/fa";
import { FiChevronRight, FiPackage } from "react-icons/fi";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useStoreSettings } from "../context/StoreSettingsContext";
import styles from "./page.module.css";

export default function NewCollectionPage() {
  const { products, productsLoading } = useCart();
  const { navbarSettings } = useStoreSettings();

  const config = useMemo(() => {
    return (
      navbarSettings?.items?.find((i) => i.id === "new-collection") || {
        label: "New Collection",
        description: "Fresh arrivals, exotic varieties, and newly potted nursery selections.",
        productIds: [],
      }
    );
  }, [navbarSettings]);

  // Find products configured for this section, or fallback to the newest published products
  const displayProducts = useMemo(() => {
    if (!products || !products.length) return [];
    if (config.productIds && config.productIds.length > 0) {
      return config.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean);
    }
    // Fallback: newest products in store
    return [...products].slice(0, 12);
  }, [products, config]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <FiChevronRight aria-hidden="true" />
          <span>{config.label || "New Collection"}</span>
        </nav>

        {/* Hero Banner */}
        <header className={styles.hero}>
          <div className={styles.badge}>
            <FaLeaf aria-hidden="true" />
            <span>Latest Arrivals</span>
          </div>
          <h1 className={styles.title}>{config.label || "New Collection"}</h1>
          <p className={styles.description}>
            {config.description ||
              "Discover our newest botanical additions, rare graftings, and fresh nursery arrivals."}
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
            Loading new collection...
          </p>
        ) : displayProducts.length === 0 ? (
          <div className={styles.empty}>
            <FiPackage style={{ width: 44, height: 44, color: "#8da595" }} />
            <h3>No Products Available</h3>
            <p>New botanical arrivals will be listed soon. In the meantime, browse our main catalogue.</p>
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
