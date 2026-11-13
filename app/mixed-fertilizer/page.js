"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FaLeaf } from "react-icons/fa";
import { FiChevronRight, FiPackage } from "react-icons/fi";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useStoreSettings } from "../context/StoreSettingsContext";
import styles from "./page.module.css";

export default function MixedFertilizerPage() {
  const { products, productsLoading } = useCart();
  const { navbarSettings } = useStoreSettings();

  const config = useMemo(() => {
    return (
      navbarSettings?.items?.find((i) => i.id === "mixed-fertilizer") || {
        label: "Mixed Fertilizer",
        description: "Specialized organic plant food & nutrient blends for healthy growth and blooming.",
        productIds: [],
      }
    );
  }, [navbarSettings]);

  // Find products configured for this section, or fallback to matching fertilizer products
  const displayProducts = useMemo(() => {
    if (!products || !products.length) return [];
    if (config.productIds && config.productIds.length > 0) {
      return config.productIds
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean);
    }
    // Fallback: any product containing fertilizer / nutrient / food in title or description
    const filtered = products.filter((p) => {
      const text = `${p.title} ${p.description || ""}`.toLowerCase();
      return (
        text.includes("fertilizer") ||
        text.includes("mixed") ||
        text.includes("organic") ||
        text.includes("soil")
      );
    });
    return filtered.length > 0 ? filtered : products.slice(0, 8);
  }, [products, config]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <FiChevronRight aria-hidden="true" />
          <span>{config.label || "Mixed Fertilizer"}</span>
        </nav>

        {/* Hero Banner */}
        <header className={styles.hero}>
          <div className={styles.badge}>
            <FaLeaf aria-hidden="true" />
            <span>Plant Nutrition</span>
          </div>
          <h1 className={styles.title}>{config.label || "Mixed Fertilizer"}</h1>
          <p className={styles.description}>
            {config.description ||
              "Specialized organic plant food & nutrient blends for healthy growth, root vigor, and abundant blooms."}
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
            Loading fertilizer collection...
          </p>
        ) : displayProducts.length === 0 ? (
          <div className={styles.empty}>
            <FiPackage style={{ width: 44, height: 44, color: "#8da595" }} />
            <h3>No Products Available</h3>
            <p>We are restocking this section. Explore our full botanical collection below.</p>
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
