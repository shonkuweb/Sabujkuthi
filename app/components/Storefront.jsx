"use client";

import { useEffect } from "react";
import { business } from "../../lib/business.mjs";
import CategoryCatalog from "./CategoryCatalog";
import PackingTicker from "./PackingTicker";
import CustomerReviews from "./CustomerReviews";
import VideoReels from "./VideoReels";
import { useStoreSearch } from "./StoreShell";
import { useCategoryCatalog } from "../hooks/useCategories";
import { useCart } from "../context/CartContext";

export default function Storefront({ categorySlug = null }) {
  const { searchQuery, setSearchQuery } = useStoreSearch();
  const { categories, loading, error } = useCategoryCatalog();
  const { products, productsLoading, productsError } = useCart();
  useEffect(() => { if (categorySlug) setSearchQuery(''); }, [categorySlug, setSearchQuery]);
  const heroStyle = { background: 'url("https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev/SabujKuthi/assets/hero-banner.png") center/cover no-repeat' };

  return (
    <main>
      {!searchQuery && !categorySlug && <>
        <section className="hero" style={heroStyle} role="img" aria-label="Nursery garden banner" />
        <div className="notice"><p className="notice-track">{business.name} · {business.address} &nbsp;&nbsp;|&nbsp;&nbsp; Call / WhatsApp: {business.phoneDisplay}</p></div>
      </>}
      <CategoryCatalog categories={categories} products={products} loading={productsLoading || loading} error={productsError || error} categorySlug={categorySlug} searchQuery={searchQuery} />
      <PackingTicker />
      {!categorySlug && <VideoReels />}
      <CustomerReviews />
    </main>
  );
}
