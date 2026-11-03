"use client";

import { useEffect } from "react";
import { business } from "../../lib/business.mjs";
import CategoryCatalog from "./CategoryCatalog";
import HeroBanner from "./HeroBanner";
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
  return (
    <main>
      {!searchQuery && !categorySlug && <HeroBanner />}
      <CategoryCatalog categories={categories} products={products} loading={productsLoading || loading} error={productsError || error} categorySlug={categorySlug} searchQuery={searchQuery} />
      <PackingTicker />
      {!categorySlug && <VideoReels />}
      <CustomerReviews />
    </main>
  );
}
