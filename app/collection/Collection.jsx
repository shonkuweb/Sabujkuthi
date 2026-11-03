"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiSliders, FiX } from "react-icons/fi";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useCategoryCatalog } from "../hooks/useCategories";
import { useStoreSearch } from "../components/StoreShell";
import styles from "./page.module.css";

export default function Collection() {
  const { products, productsLoading, productsError } = useCart();
  const { categories, loading, error } = useCategoryCatalog();
  const { searchQuery, setSearchQuery } = useStoreSearch();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const visible = categories.filter(category => category.isVisible !== false);
  useEffect(() => { setSelected(current => current.filter(id => categories.some(category => category.id === id && category.isVisible !== false))); }, [categories]);
  const matching = products.filter(product => (!selected.length || selected.includes(product.categoryId)) && product.title.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const toggle = id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

  return <main className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Collection</span></nav>
    <div className={styles.heading}><div><h1>Collection</h1><p>Find your next favourite plant.</p></div><button className={styles.filterButton} type="button" aria-expanded={filterOpen} aria-controls="collection-filters" onClick={() => setFilterOpen(current => !current)}><FiSliders aria-hidden="true" />Filter{selected.length > 0 && <span>{selected.length}</span>}</button></div>
    {filterOpen && <div className={styles.filters} id="collection-filters"><fieldset><legend>Filter by category</legend><div className={styles.options}>
      {visible.map(category => <label key={category.id}><input type="checkbox" checked={selected.includes(category.id)} onChange={() => toggle(category.id)} /><span>{category.name}</span><small>{products.filter(product => product.categoryId === category.id).length}</small></label>)}
      {!visible.length && !loading && <p>No categories available yet.</p>}
    </div></fieldset><div className={styles.filterActions}><button type="button" onClick={() => setSelected([])} disabled={!selected.length}>Clear filters</button><button type="button" onClick={() => setFilterOpen(false)}>Done</button></div></div>}
    {selected.length > 0 && <div className={styles.chips}>{visible.filter(category => selected.includes(category.id)).map(category => <button type="button" key={category.id} onClick={() => toggle(category.id)} aria-label={`Remove ${category.name} filter`}>{category.name}<FiX aria-hidden="true" /></button>)}</div>}
    <section id="collection-results" aria-label="Plant collection" className={styles.results}>
      {loading || productsLoading ? <p className={styles.message} role="status">Loading plants…</p> : error || productsError ? <p className={styles.message} role="alert">Unable to load the collection. Please refresh to try again.</p> : <>
        <p className={styles.count} role="status">{matching.length} {matching.length === 1 ? 'plant' : 'plants'}{searchQuery.trim() ? ` matching “${searchQuery.trim()}”` : ''}{!selected.length && !searchQuery.trim() ? ' in our collection' : ''}</p>
        {matching.length ? <div className={styles.grid}>{matching.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className={styles.empty}><h2>{products.length ? 'No matching plants' : 'Our collection is growing'}</h2><p>{products.length ? 'Try another category or search term.' : 'New plants will appear here soon.'}</p>{(selected.length > 0 || searchQuery) && <button type="button" onClick={() => { setSelected([]); setSearchQuery(''); }}>Reset search and filters</button>}</div>}
      </>}
    </section>
  </main>;
}
