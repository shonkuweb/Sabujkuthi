"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiSliders, FiX } from "react-icons/fi";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useCategoryCatalog } from "../hooks/useCategories";
import { useStoreSearch } from "../components/StoreShell";
import { buildCategoryTree, flattenCategoryTree, getCategoryAndDescendantIds } from "../../lib/category-tree.mjs";
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

export default function Collection() {
  const { products, productsLoading, productsError } = useCart();
  const { categories, loading, error } = useCategoryCatalog();
  const { searchQuery, setSearchQuery } = useStoreSearch();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  const visible = useMemo(() => categories.filter(category => category.isVisible !== false), [categories]);

  const toggleCollapse = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isHiddenByCollapsedParent = (catId) => {
    let current = visible.find(c => c.id === catId);
    while (current?.parentId) {
      if (collapsedCategories.has(current.parentId)) return true;
      current = visible.find(c => c.id === current.parentId);
    }
    return false;
  };

  // Flattened tree with hierarchy depth
  const flatCategories = useMemo(() => {
    const tree = buildCategoryTree(visible);
    return flattenCategoryTree(tree);
  }, [visible]);

  useEffect(() => {
    setSelected(current => current.filter(id => categories.some(category => category.id === id && category.isVisible !== false)));
  }, [categories]);

  // Map category ID to its matching product count (including descendants and multi-category)
  const categoryProductCounts = useMemo(() => {
    const counts = {};
    for (const cat of visible) {
      const allIds = new Set(getCategoryAndDescendantIds(cat.id, visible));
      counts[cat.id] = products.filter(p => getProductCategoryIds(p).some(id => allIds.has(id))).length;
    }
    return counts;
  }, [visible, products]);

  // Filter products by selected categories and search query
  const matching = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let allowedIds = null;
    if (selected.length > 0) {
      allowedIds = new Set(selected.flatMap(id => getCategoryAndDescendantIds(id, visible)));
    }

    return products.filter(product => {
      if (allowedIds) {
        const prodCatIds = getProductCategoryIds(product);
        const matchesCat = prodCatIds.some(id => allowedIds.has(id));
        if (!matchesCat) return false;
      }
      if (query && !product.title.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [products, selected, visible, searchQuery]);

  const toggle = id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

  return <main className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Collection</span></nav>
    <div className={styles.heading}><div><h1>Collection</h1><p>Find your next favourite plant.</p></div><button className={styles.filterButton} type="button" aria-expanded={filterOpen} aria-controls="collection-filters" onClick={() => setFilterOpen(current => !current)}><FiSliders aria-hidden="true" />Filter{selected.length > 0 && <span>{selected.length}</span>}</button></div>
    {filterOpen && <div className={styles.filters} id="collection-filters"><fieldset><legend>Filter by category</legend><div className={styles.options}>
      {flatCategories.filter(category => !isHiddenByCollapsedParent(category.id)).map(category => {
        const hasChildren = visible.some(c => c.parentId === category.id);
        const isCollapsed = collapsedCategories.has(category.id);
        return (
          <div key={category.id} style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: `${Math.min(3, category.depth) * 16}px` }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={selected.includes(category.id)} onChange={() => toggle(category.id)} />
              <span>{category.depth > 0 ? `↳ ${category.name}` : category.name}</span>
              <small>{categoryProductCounts[category.id] ?? 0}</small>
            </label>
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => toggleCollapse(category.id, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#15803d' }}
                aria-label={isCollapsed ? `Expand subcategories of ${category.name}` : `Collapse subcategories of ${category.name}`}
              >
                {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
              </button>
            )}
          </div>
        );
      })}
      {!visible.length && !loading && <p>No categories available yet.</p>}
    </div></fieldset><div className={styles.filterActions}><button type="button" onClick={() => setSelected([])} disabled={!selected.length}>Clear filters</button><button type="button" onClick={() => setFilterOpen(false)}>Done</button></div></div>}
    
    <div className={styles.desktopLayout}>
      <aside className={styles.desktopSidebar} aria-label="Category filter sidebar">
        <div className={styles.sidebarHeader}>
          <h3>Filter by Category</h3>
          {selected.length > 0 && (
            <button type="button" className={styles.sidebarClearBtn} onClick={() => setSelected([])}>
              Clear
            </button>
          )}
        </div>
        <div className={styles.sidebarOptions}>
          {flatCategories.filter(category => !isHiddenByCollapsedParent(category.id)).map(category => {
            const hasChildren = visible.some(c => c.parentId === category.id);
            const isCollapsed = collapsedCategories.has(category.id);
            return (
              <div
                key={category.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: category.depth > 0 ? `${category.depth * 14}px` : undefined,
                  fontWeight: category.depth === 0 ? 600 : 400,
                  width: '100%'
                }}
              >
                <label className={styles.sidebarLabel} style={{ flex: 1, margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(category.id)}
                    onChange={() => toggle(category.id)}
                  />
                  <span>{category.depth > 0 ? `↳ ${category.name}` : category.name}</span>
                  <small>{categoryProductCounts[category.id] ?? 0}</small>
                </label>
                {hasChildren && (
                  <button
                    type="button"
                    onClick={(e) => toggleCollapse(category.id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#15803d' }}
                    aria-label={isCollapsed ? `Expand subcategories of ${category.name}` : `Collapse subcategories of ${category.name}`}
                  >
                    {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
                  </button>
                )}
              </div>
            );
          })}
          {!visible.length && !loading && <p className={styles.sidebarEmpty}>No categories available.</p>}
        </div>
      </aside>

      <div className={styles.desktopContent}>
        {selected.length > 0 && <div className={styles.chips}>{visible.filter(category => selected.includes(category.id)).map(category => <button type="button" key={category.id} onClick={() => toggle(category.id)} aria-label={`Remove ${category.name} filter`}>{category.name}<FiX aria-hidden="true" /></button>)}</div>}
        <section id="collection-results" aria-label="Plant collection" className={styles.results}>
          {loading || productsLoading ? <p className={styles.message} role="status">Loading plants…</p> : error || productsError ? <p className={styles.message} role="alert">Unable to load the collection. Please refresh to try again.</p> : <>
            <p className={styles.count} role="status">{matching.length} {matching.length === 1 ? 'plant' : 'plants'}{searchQuery.trim() ? ` matching “${searchQuery.trim()}”` : ''}{!selected.length && !searchQuery.trim() ? ' in our collection' : ''}</p>
            {matching.length ? <div className={styles.grid}>{matching.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className={styles.empty}><h2>{products.length ? 'No matching plants' : 'Our collection is growing'}</h2><p>{products.length ? 'Try another category or search term.' : 'New plants will appear here soon.'}</p>{(selected.length > 0 || searchQuery) && <button type="button" onClick={() => { setSelected([]); setSearchQuery(''); }}>Reset search and filters</button>}</div>}
          </>}
        </section>
      </div>
    </div>
  </main>;
}
