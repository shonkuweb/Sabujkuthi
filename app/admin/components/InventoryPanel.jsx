"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  FiBox,
  FiCheck,
  FiEdit2,
  FiGrid,
  FiImage,
  FiList,
  FiPlus,
  FiSearch,
  FiTag,
  FiTrash2,
  FiUpload,
  FiX
} from "react-icons/fi";
import { useCategories } from "../../hooks/useCategories";
import { buildCategoryTree, flattenCategoryTree } from "../../../lib/category-tree.mjs";
import { INDIAN_STATES } from "../../../lib/indian-regions.mjs";
import styles from "./CategoriesPanel.module.css";
import invStyles from "./InventoryPanel.module.css";

const blank = {
  title: "",
  categoryId: "",
  categoryIds: [],
  shippingScope: "all_india",
  deliveryStates: "",
  deliveryPincodes: "",
  price: "",
  oldPrice: "",
  description: "",
  image: "",
  image2: "",
  inStock: true,
  plantCare: "",
  deliveryReturns: "",
  deliveryNote: "",
  replacementInfo: "",
  deliveryInfo: "",
  supportInfo: "",
  packagingInfo: "",
  soldLast24Hours: "",
  demoMetrics: true,
};

export default function InventoryPanel() {
  const categories = useCategories();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [isDraggingPrimary, setIsDraggingPrimary] = useState(false);
  const [isDraggingSecondary, setIsDraggingSecondary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'in_stock' | 'sold_out'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  const fileRef = useRef(null);
  const fileRef2 = useRef(null);
  const nameRef = useRef(null);
  const imageVersion = useRef(0);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/products?admin=1", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Unable to load inventory.");
      setProducts(data);
    } catch (error) { setLoadError(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (form) nameRef.current?.focus(); }, [form?.id, form === null]);

  const openForm = product => {
    imageVersion.current++;
    let catIds = [];
    if (product) {
      if (Array.isArray(product.categoryIds)) catIds = product.categoryIds;
      else if (typeof product.categoryIds === "string") {
        try { catIds = JSON.parse(product.categoryIds); } catch {}
      }
      if (!catIds.length && product.categoryId) catIds = [product.categoryId];
    }
    setForm(product ? {
      ...blank,
      ...product,
      categoryIds: catIds,
      categoryId: product.categoryId || catIds[0] || "",
      shippingScope: product.shippingScope || (product.deliveryPincodes ? "pincodes" : "all_india"),
      deliveryStates: product.deliveryStates || "",
      deliveryPincodes: product.deliveryPincodes || "",
      oldPrice: product.oldPrice || "",
      image: product.image || "",
      image2: product.image2 || "",
      description: product.description || "",
      ...Object.fromEntries(["plantCare", "deliveryReturns", "deliveryNote", "replacementInfo", "deliveryInfo", "supportInfo", "packagingInfo", "soldLast24Hours"].map(key => [key, product[key] ?? ""]))
    } : { ...blank });
    setError(""); setNotice(""); setProcessing(false);
  };

  const close = () => {
    imageVersion.current++;
    setForm(null);
    setProcessing(false);
    setError("");
    setIsDraggingPrimary(false);
    setIsDraggingSecondary(false);
  };

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const toggleCategory = (catId) => {
    setForm(current => {
      const currentIds = current.categoryIds || [];
      const nextIds = currentIds.includes(catId)
        ? currentIds.filter(id => id !== catId)
        : [...currentIds, catId];
      const primary = nextIds.includes(current.categoryId)
        ? current.categoryId
        : nextIds[0] || "";
      return { ...current, categoryIds: nextIds, categoryId: primary };
    });
  };

  const processFile = async (file, field = "image") => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG or WebP image."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose an image smaller than 10 MB."); return; }
    const version = ++imageVersion.current;
    setProcessing(true);
    try {
      const thumbnail = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true });
      const dataUrl = await imageCompression.getDataUrlFromFile(thumbnail);
      if (version === imageVersion.current) setForm(current => current ? { ...current, [field]: dataUrl } : null);
    } catch {
      if (version === imageVersion.current) setError("This image could not be processed. Please try another.");
    } finally {
      if (version === imageVersion.current) setProcessing(false);
    }
  };

  const upload = async (event, field = "image") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    processFile(file, field);
  };

  const save = async event => {
    event.preventDefault();
    if (!form.categoryIds?.length && !form.categoryId) {
      setError("Please select at least one category for this plant.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || form.categoryIds[0],
        categoryIds: form.categoryIds,
      };
      const response = await fetch("/api/products", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save product.");
      setProducts(current => form.id ? current.map(p => p.id === form.id ? data.product : p) : [data.product, ...current]);
      setNotice(form.id ? "Product updated." : "Product added.");
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async product => {
    if (!window.confirm(`Delete "${product.title}" from your catalog?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete product.");
      setProducts(current => current.filter(p => p.id !== product.id));
      setNotice("Product deleted.");
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStockQuick = async (product) => {
    setUpdatingStockId(product.id);
    setError("");
    try {
      const payload = {
        ...product,
        inStock: !product.inStock,
      };
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update stock status.");
      setProducts(current => current.map(p => p.id === product.id ? data.product : p));
      setNotice(`"${product.title}" marked as ${!product.inStock ? "in stock" : "sold out"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStockId(null);
    }
  };

  const formatRupee = val => {
    const num = Number(val);
    if (!Number.isFinite(num)) return val;
    return num.toLocaleString("en-IN");
  };

  const getDiscountPercent = (price, oldPrice) => {
    const numPrice = Number(price);
    const numOld = Number(oldPrice);
    if (!numPrice || !numOld || numOld <= numPrice) return null;
    return Math.round(((numOld - numPrice) / numOld) * 100);
  };

  const flattenedCategories = flattenCategoryTree(buildCategoryTree(categories));

  // Filtered product set
  const filteredProducts = products.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = p.title.toLowerCase().includes(q);
      const catIds = Array.isArray(p.categoryIds) ? p.categoryIds : [p.categoryId].filter(Boolean);
      const catMatch = categories.some(c => catIds.includes(c.id) && c.name.toLowerCase().includes(q));
      if (!titleMatch && !catMatch) return false;
    }
    if (selectedCatFilter) {
      const catIds = Array.isArray(p.categoryIds) ? p.categoryIds : [p.categoryId].filter(Boolean);
      if (!catIds.includes(selectedCatFilter)) return false;
    }
    if (stockFilter === "in_stock" && !p.inStock) return false;
    if (stockFilter === "sold_out" && p.inStock) return false;
    return true;
  });

  const totalCount = products.length;
  const inStockCount = products.filter(p => p.inStock).length;
  const soldOutCount = products.filter(p => !p.inStock).length;

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <p>Manage the plants and products displayed in your store.</p>
        <button
          type="button"
          className={styles.primary}
          onClick={() => openForm()}
          disabled={saving || processing || loading || !!loadError || !categories.length}
        >
          <FiPlus aria-hidden="true" />
          <span>Add product</span>
        </button>
      </div>

      {!categories.length && (
        <p className={styles.hint}>Create a category in the Categories tab before adding products.</p>
      )}
      {notice && (
        <p role="status" className={styles.success}>
          <FiCheck aria-hidden="true" />
          {notice}
        </p>
      )}

      {form && (
        <form className={styles.editor} onSubmit={save} aria-label={form.id ? "Edit product" : "Add product"}>
          <div className={styles.editorHeading}>
            <h2>{form.id ? "Edit product" : "Add product"}</h2>
            <button type="button" className={styles.iconButton} aria-label="Close product form" onClick={close} disabled={saving}><FiX /></button>
          </div>

          <fieldset className={styles.fields} disabled={saving}>
            <label className={styles.label} htmlFor="product-title">Product name</label>
            <input
              className={styles.nameInput}
              id="product-title"
              ref={nameRef}
              value={form.title}
              maxLength={120}
              required
              placeholder="e.g. Adenium Desert Rose, Alphonso Mango Plant"
              onChange={event => change("title", event.target.value)}
            />

            {/* Hierarchical Multi-Category Selector */}
            <label className={styles.label}>Category Assignment</label>
            <p className={styles.hint} style={{ marginTop: -4, marginBottom: 10 }}>
              Select one or multiple categories (parent, subcategory, or both).
            </p>
            <div className={invStyles.categoryTreeBox}>
              {flattenedCategories.map(cat => {
                const isChecked = (form.categoryIds || []).includes(cat.id);
                const isPrimary = form.categoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`${invStyles.categoryOptionRow} ${isChecked ? invStyles.categoryOptionRowSelected : ""}`}
                    style={{ paddingLeft: `${14 + cat.depth * 22}px` }}
                  >
                    <label className={invStyles.categoryCheckboxLabel}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      <span className={cat.depth === 0 ? invStyles.parentCatName : invStyles.subCatName}>
                        {cat.depth > 0 && <span className={invStyles.treeIndicator}>└─ </span>}
                        {cat.name}
                      </span>
                      {cat.isVisible === false && <small className={invStyles.hiddenNotice}>(hidden)</small>}
                    </label>
                    {isChecked && (
                      <button
                        type="button"
                        className={`${invStyles.primaryBadgeBtn} ${isPrimary ? invStyles.isPrimaryActive : ""}`}
                        onClick={() => change("categoryId", cat.id)}
                        title="Set as primary category"
                      >
                        {isPrimary ? "★ Primary" : "Set Primary"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={styles.formColumns}>
              <div>
                <label className={styles.label} htmlFor="product-price">Selling price (₹)</label>
                <input className={styles.nameInput} id="product-price" type="number" min="0" max="10000000" step="0.01" required value={form.price} onChange={event => change("price", event.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className={styles.label} htmlFor="product-old-price">Original price (₹, optional)</label>
                <input className={styles.nameInput} id="product-old-price" type="number" min="0" max="10000000" step="0.01" value={form.oldPrice} onChange={event => change("oldPrice", event.target.value)} placeholder="Before discount" />
              </div>
            </div>

            {/* Images */}
            <span className={styles.label}>Product images (up to 2)</span>
            <div className={styles.formColumns}>
              <div>
                <span className={styles.label} style={{ fontSize: 11, color: "#68786e", marginBottom: 6 }}>Primary image</span>
                <div
                  className={`${styles.imagePicker} ${isDraggingPrimary ? styles.imagePickerDragging : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPrimary(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingPrimary(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingPrimary(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPrimary(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file, "image");
                  }}
                >
                  <div
                    className={`${styles.preview} ${isDraggingPrimary ? styles.previewDragging : ""}`}
                    onClick={() => fileRef.current?.click()}
                    title="Click or drag and drop image here"
                  >
                    {form.image ? <img src={form.image} alt="Primary image preview" /> : isDraggingPrimary ? <FiUpload aria-hidden="true" /> : <FiImage aria-hidden="true" />}
                  </div>
                  <div>
                    <input ref={fileRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload product image" disabled={processing} onChange={e => upload(e, "image")} />
                    <button type="button" className={styles.secondary} disabled={processing} onClick={() => fileRef.current?.click()}><FiUpload aria-hidden="true" />{processing ? "Preparing…" : form.image ? "Change image" : "Upload image"}</button>
                    <p className={styles.hint}>Drag & drop image here</p>
                    {form.image && <button type="button" className={styles.textButton} disabled={processing} onClick={() => change("image", "")}>Remove image</button>}
                  </div>
                </div>
              </div>

              <div>
                <span className={styles.label} style={{ fontSize: 11, color: "#68786e", marginBottom: 6 }}>Second image (optional)</span>
                <div
                  className={`${styles.imagePicker} ${isDraggingSecondary ? styles.imagePickerDragging : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingSecondary(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingSecondary(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingSecondary(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingSecondary(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file, "image2");
                  }}
                >
                  <div
                    className={`${styles.preview} ${isDraggingSecondary ? styles.previewDragging : ""}`}
                    onClick={() => fileRef2.current?.click()}
                    title="Click or drag and drop image here"
                  >
                    {form.image2 ? <img src={form.image2} alt="Second image preview" /> : isDraggingSecondary ? <FiUpload aria-hidden="true" /> : <FiImage aria-hidden="true" />}
                  </div>
                  <div>
                    <input ref={fileRef2} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload second product image" disabled={processing} onChange={e => upload(e, "image2")} />
                    <button type="button" className={styles.secondary} disabled={processing} onClick={() => fileRef2.current?.click()}><FiUpload aria-hidden="true" />{processing ? "Preparing…" : form.image2 ? "Change image" : "Upload image"}</button>
                    <p className={styles.hint}>Drag & drop image here</p>
                    {form.image2 && <button type="button" className={styles.textButton} disabled={processing} onClick={() => change("image2", "")}>Remove image</button>}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery & Shipping Scope */}
            <h3 className={styles.fieldHeading}>Delivery & Shipping Scope</h3>
            <div className={invStyles.shippingScopeSelector}>
              <label className={`${invStyles.scopeOption} ${form.shippingScope === "all_india" ? invStyles.scopeOptionActive : ""}`}>
                <input
                  type="radio"
                  name="shippingScope"
                  value="all_india"
                  checked={form.shippingScope === "all_india"}
                  onChange={() => change("shippingScope", "all_india")}
                />
                <div>
                  <strong>All India Delivery</strong>
                  <p>Ships to all serviceable delivery pincodes across India.</p>
                </div>
              </label>

              <label className={`${invStyles.scopeOption} ${form.shippingScope === "states" ? invStyles.scopeOptionActive : ""}`}>
                <input
                  type="radio"
                  name="shippingScope"
                  value="states"
                  checked={form.shippingScope === "states"}
                  onChange={() => change("shippingScope", "states")}
                />
                <div>
                  <strong>Specific States Only</strong>
                  <p>Restricted to selected states/UTs (e.g. West Bengal, Odisha).</p>
                </div>
              </label>

              <label className={`${invStyles.scopeOption} ${form.shippingScope === "pincodes" ? invStyles.scopeOptionActive : ""}`}>
                <input
                  type="radio"
                  name="shippingScope"
                  value="pincodes"
                  checked={form.shippingScope === "pincodes"}
                  onChange={() => change("shippingScope", "pincodes")}
                />
                <div>
                  <strong>Specific Pincodes Only</strong>
                  <p>Only customers with exact matching pincodes can buy.</p>
                </div>
              </label>
            </div>

            {form.shippingScope === "states" && (
              <div className={invStyles.statesPickerBox}>
                <span className={styles.label} style={{ marginBottom: 4 }}>Select Allowed States / Territories</span>
                <p className={styles.hint} style={{ margin: "0 0 10px" }}>Only customers shipping to selected states will be permitted to checkout this plant.</p>
                <div className={invStyles.statesGrid}>
                  {INDIAN_STATES.map(stateName => {
                    const currentSelected = (form.deliveryStates || "").split(",").map(s => s.trim()).filter(Boolean);
                    const isChecked = currentSelected.includes(stateName);
                    return (
                      <label key={stateName} className={invStyles.stateChip}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = isChecked
                              ? currentSelected.filter(s => s !== stateName)
                              : [...currentSelected, stateName];
                            change("deliveryStates", next.join(", "));
                          }}
                        />
                        <span>{stateName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {form.shippingScope === "pincodes" && (
              <div className={invStyles.pincodesBox}>
                <label className={styles.label} htmlFor="delivery-pincodes">Allowed 6-digit Pincodes (comma-separated)</label>
                <textarea
                  className={styles.nameInput}
                  id="delivery-pincodes"
                  rows={3}
                  value={form.deliveryPincodes || ""}
                  placeholder="e.g. 700001, 721253, 700091"
                  onChange={event => change("deliveryPincodes", event.target.value)}
                />
                <p className={styles.hint}>Separate multiple pincodes with commas. Customers outside these pincodes cannot place an order for this plant.</p>
              </div>
            )}

            <label className={styles.label} htmlFor="product-description">Description (optional)</label>
            <textarea className={styles.nameInput} id="product-description" rows={4} maxLength={10000} value={form.description || ""} onChange={event => change("description", event.target.value)} placeholder="Tell customers about this plant" />

            <h3 className={styles.fieldHeading}>Product information</h3>
            {[
              ["plantCare", "Plant Care Tips", "Watering, sunlight, soil and other care instructions"],
              ["deliveryReturns", "Delivery & Returns", "Delivery times and the return policy for this product"],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className={styles.label} htmlFor={`product-${key}`}>{label}</label>
                <textarea className={styles.nameInput} id={`product-${key}`} rows={4} maxLength={10000} value={form[key] || ""} placeholder={placeholder} onChange={event => change(key, event.target.value)} />
              </div>
            ))}

            <h3 className={styles.fieldHeading}>Highlights below purchase buttons</h3>
            <div className={styles.formColumns}>
              {[
                ["replacementInfo", "Replacement", "e.g. 7-day live plant guarantee"],
                ["deliveryInfo", "Delivery", "e.g. Ships across India in 3-5 days"],
                ["supportInfo", "Guidance", "e.g. Lifetime WhatsApp gardening advice"],
                ["packagingInfo", "Packaging", "e.g. 5-layer corrugated ventilated box"],
              ].map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className={styles.label} htmlFor={`product-${key}`}>{label}</label>
                  <input className={styles.nameInput} id={`product-${key}`} value={form[key] || ""} maxLength={10000} placeholder={placeholder} onChange={event => change(key, event.target.value)} />
                </div>
              ))}
            </div>

            <label className={styles.label} htmlFor="product-sold-count">Sold in last 24 hours (optional)</label>
            <input className={styles.nameInput} id="product-sold-count" type="number" min="0" max="1000000" step="1" value={form.soldLast24Hours ?? ""} onChange={event => change("soldLast24Hours", event.target.value)} placeholder="Enter count or leave blank" />

            <div className={styles.visibility}>
              <div><label htmlFor="product-demo-metrics">Sample reviews & viewer count</label><p>Shows clearly labelled demo statistics on the product page.</p></div>
              <button id="product-demo-metrics" type="button" role="switch" aria-label="Sample reviews and viewer count" aria-checked={form.demoMetrics} className={styles.switch} onClick={() => change("demoMetrics", !form.demoMetrics)}><span /></button>
            </div>

            <div className={styles.visibility}>
              <div><label htmlFor="product-stock">In stock</label><p>Turn off to display this product as sold out.</p></div>
              <button id="product-stock" type="button" role="switch" aria-label="In stock" aria-checked={form.inStock} className={styles.switch} onClick={() => change("inStock", !form.inStock)}><span /></button>
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <div className={styles.actions}>
              {form.id && (
                <button type="button" className={styles.dangerButton} onClick={() => removeProduct(form)} disabled={saving || processing}>
                  <FiTrash2 aria-hidden="true" />Delete product
                </button>
              )}
              <button type="button" className={styles.secondary} onClick={close}>Cancel</button>
              <button className={styles.primary} type="submit" disabled={processing}>{saving ? "Saving…" : form.id ? "Save changes" : "Add product"}</button>
            </div>
          </fieldset>
        </form>
      )}

      {loading ? (
        <div className={styles.empty} role="status">Loading inventory…</div>
      ) : loadError ? (
        <div className={styles.empty}><p role="alert">{loadError}</p><button type="button" className={styles.secondary} onClick={load}>Try again</button></div>
      ) : !products.length ? (
        !form && <div className={styles.empty}><span className={styles.emptyIcon}><FiBox aria-hidden="true" /></span><h2>No products yet</h2><p>Add your first product and assign it to a category.</p></div>
      ) : (
        <>
          {/* STATS OVERVIEW */}
          <div className={invStyles.statsBar}>
            <div className={invStyles.statCard}>
              <span>All Products:</span>
              <strong>{totalCount}</strong>
            </div>
            <div className={invStyles.statCard}>
              <span className={invStyles.statDotInStock} aria-hidden="true" />
              <span>In Stock:</span>
              <strong style={{ color: "#26784a" }}>{inStockCount}</strong>
            </div>
            <div className={invStyles.statCard}>
              <span className={invStyles.statDotSoldOut} aria-hidden="true" />
              <span>Sold Out:</span>
              <strong style={{ color: "#dc2626" }}>{soldOutCount}</strong>
            </div>
          </div>

          {/* TOOLBAR CONTROLS: SEARCH, FILTERS & VIEW MODE */}
          <div className={invStyles.toolbarWrap}>
            <div className={invStyles.filterControls}>
              {/* Search Box */}
              <div className={invStyles.searchBox}>
                <FiSearch aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search plants or categories…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search products"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={invStyles.clearSearchBtn}
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <select
                className={invStyles.filterSelect}
                value={selectedCatFilter}
                onChange={(e) => setSelectedCatFilter(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="">All Categories ({categories.length})</option>
                {flattenedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.depth > 0 ? "— ".repeat(c.depth) : ""}{c.name}
                  </option>
                ))}
              </select>

              {/* Stock Status Filter */}
              <select
                className={invStyles.filterSelect}
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                aria-label="Filter by stock status"
              >
                <option value="all">All Stock Status</option>
                <option value="in_stock">In Stock ({inStockCount})</option>
                <option value="sold_out">Sold Out ({soldOutCount})</option>
              </select>
            </div>

            {/* View Mode Toggle: Grid vs List */}
            <div className={invStyles.viewToggleGroup} role="group" aria-label="View layout switcher">
              <button
                type="button"
                className={`${invStyles.viewToggleBtn} ${viewMode === "grid" ? invStyles.viewToggleBtnActive : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid view"
                aria-label="Grid view"
              >
                <FiGrid />
              </button>
              <button
                type="button"
                className={`${invStyles.viewToggleBtn} ${viewMode === "list" ? invStyles.viewToggleBtnActive : ""}`}
                onClick={() => setViewMode("list")}
                title="List view"
                aria-label="List view"
              >
                <FiList />
              </button>
            </div>
          </div>

          {/* EMPTY FILTER STATE */}
          {filteredProducts.length === 0 ? (
            <div className={invStyles.emptyFilterState}>
              <span className={invStyles.emptyFilterIcon} aria-hidden="true">
                <FiSearch />
              </span>
              <h3>No products found</h3>
              <p>
                No plants match your search criteria. Try modifying your search or clearing the active filters.
              </p>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCatFilter("");
                  setStockFilter("all");
                }}
              >
                Reset filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* =========================================================
               BEAUTIFUL GRID VIEW
               ========================================================= */
            <div className={invStyles.productGrid} role="list" aria-label="Products catalog">
              {filteredProducts.map((product) => {
                const assignedCatIds = Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId].filter(Boolean);
                const assignedCats = categories.filter((c) => assignedCatIds.includes(c.id));
                const scopeLabel =
                  product.shippingScope === "states"
                    ? "📍 Specific States"
                    : product.shippingScope === "pincodes"
                    ? "📮 Pincodes"
                    : "🇮🇳 All India";

                const discountPercent = getDiscountPercent(product.price, product.oldPrice);

                return (
                  <article className={invStyles.productCard} key={product.id} role="listitem">
                    {/* Card Photo Container */}
                    <div className={invStyles.cardImageWrap}>
                      {product.image ? (
                        <img src={product.image} alt={product.title} className={invStyles.cardImg} loading="lazy" />
                      ) : (
                        <div className={invStyles.cardImgPlaceholder}>
                          <FiImage aria-hidden="true" />
                        </div>
                      )}

                      {/* Stock Status Badge */}
                      <span
                        className={`${invStyles.badgeTopLeft} ${
                          product.inStock ? invStyles.badgeInStock : invStyles.badgeSoldOut
                        }`}
                      >
                        {product.inStock ? "● In Stock" : "✕ Sold Out"}
                      </span>

                      {/* Discount Badge */}
                      {discountPercent !== null && (
                        <span className={invStyles.badgeDiscount}>
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className={invStyles.cardBody}>
                      <h3 className={invStyles.cardTitle} title={product.title}>
                        {product.title}
                      </h3>

                      {/* Pricing Row */}
                      <div className={invStyles.cardPriceRow}>
                        <span className={invStyles.sellingPrice}>₹{formatRupee(product.price)}</span>
                        {product.oldPrice && Number(product.oldPrice) > Number(product.price) && (
                          <span className={invStyles.originalPrice}>₹{formatRupee(product.oldPrice)}</span>
                        )}
                        {discountPercent !== null && (
                          <span className={invStyles.savingsTag}>Save ₹{formatRupee(Number(product.oldPrice) - Number(product.price))}</span>
                        )}
                      </div>

                      {/* Meta Pills */}
                      <div className={invStyles.cardMetaTags}>
                        {assignedCats.map((c) => (
                          <span key={c.id} className={invStyles.categoryPill}>
                            {c.name}
                          </span>
                        ))}
                        <span className={invStyles.shippingPill}>{scopeLabel}</span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className={invStyles.cardFooterActions}>
                      <button
                        type="button"
                        className={invStyles.quickStockBtn}
                        onClick={() => toggleStockQuick(product)}
                        disabled={saving || processing || updatingStockId === product.id}
                        title={`Click to mark as ${product.inStock ? "Sold Out" : "In Stock"}`}
                        aria-label={`Toggle stock for ${product.title}`}
                      >
                        {updatingStockId === product.id
                          ? "Updating…"
                          : product.inStock
                          ? "Mark Sold Out"
                          : "Mark In Stock"}
                      </button>

                      <div className={invStyles.actionBtns}>
                        <button
                          type="button"
                          className={invStyles.btnActionEdit}
                          aria-label={`Edit ${product.title}`}
                          disabled={saving || processing}
                          onClick={() => openForm(product)}
                        >
                          <FiEdit2 aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className={invStyles.btnActionDelete}
                          aria-label={`Delete ${product.title}`}
                          disabled={saving || processing}
                          onClick={() => removeProduct(product)}
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* =========================================================
               CLEAN TABULAR LIST VIEW
               ========================================================= */
            <div className={invStyles.listTableWrap}>
              <table className={invStyles.listTable}>
                <thead>
                  <tr>
                    <th>Plant</th>
                    <th>Categories</th>
                    <th>Price</th>
                    <th>Stock Status</th>
                    <th>Shipping Scope</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const assignedCatIds = Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId].filter(Boolean);
                    const assignedCats = categories.filter((c) => assignedCatIds.includes(c.id));
                    const scopeLabel =
                      product.shippingScope === "states"
                        ? "📍 States"
                        : product.shippingScope === "pincodes"
                        ? "📮 Pincodes"
                        : "🇮🇳 All India";

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className={invStyles.tableTitleCol}>
                            <div className={invStyles.tableThumb}>
                              {product.image ? (
                                <img src={product.image} alt={product.title} />
                              ) : (
                                <FiImage aria-hidden="true" />
                              )}
                            </div>
                            <div className={invStyles.tableTitleText}>
                              <strong>{product.title}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {assignedCats.map((c) => (
                              <span key={c.id} className={invStyles.categoryPill}>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong style={{ color: "#1a4d32", fontSize: 14 }}>
                              ₹{formatRupee(product.price)}
                            </strong>
                            {product.oldPrice && (
                              <div style={{ fontSize: 11, color: "#8a968f", textDecoration: "line-through" }}>
                                ₹{formatRupee(product.oldPrice)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={invStyles.quickStockBtn}
                            onClick={() => toggleStockQuick(product)}
                            disabled={saving || processing || updatingStockId === product.id}
                            style={{ fontWeight: 600 }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: product.inStock ? "#26784a" : "#dc2626",
                                marginRight: 4,
                              }}
                            />
                            {product.inStock ? "In Stock" : "Sold Out"}
                          </button>
                        </td>
                        <td>
                          <span className={invStyles.shippingPill}>{scopeLabel}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              className={invStyles.btnActionEdit}
                              onClick={() => openForm(product)}
                              disabled={saving || processing}
                              aria-label={`Edit ${product.title}`}
                            >
                              <FiEdit2 aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className={invStyles.btnActionDelete}
                              onClick={() => removeProduct(product)}
                              disabled={saving || processing}
                              aria-label={`Delete ${product.title}`}
                            >
                              <FiTrash2 aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
