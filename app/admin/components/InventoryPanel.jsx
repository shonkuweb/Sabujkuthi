"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { FiBox, FiCheck, FiEdit2, FiImage, FiPlus, FiTrash2, FiUpload, FiX } from "react-icons/fi";
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
  const [isDraggingPrimary, setIsDraggingPrimary] = useState(false);
  const [isDraggingSecondary, setIsDraggingSecondary] = useState(false);
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

  const flattenedCategories = flattenCategoryTree(buildCategoryTree(categories));

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

      {!categories.length && <p className={styles.hint}>Create a category in the Categories tab before adding products.</p>}
      {notice && <p role="status" className={styles.success}><FiCheck aria-hidden="true" />{notice}</p>}

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
            <p className={styles.hint}>Restrict delivery by region so customers outside cannot order this plant.</p>

            <div className={invStyles.shippingScopeSelector}>
              {[
                { id: "all_india", label: "🇮🇳 All Over India", desc: "Available for delivery anywhere in India" },
                { id: "states", label: "📍 Specific States Only", desc: "Available only in selected states/UTs" },
                { id: "pincodes", label: "📮 Specific Pincodes Only", desc: "Available only to listed 6-digit pincodes" },
              ].map(scope => (
                <label
                  key={scope.id}
                  className={`${invStyles.scopeOption} ${form.shippingScope === scope.id ? invStyles.scopeOptionActive : ""}`}
                >
                  <input
                    type="radio"
                    name="shippingScope"
                    value={scope.id}
                    checked={form.shippingScope === scope.id}
                    onChange={() => change("shippingScope", scope.id)}
                  />
                  <div>
                    <strong>{scope.label}</strong>
                    <p>{scope.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {form.shippingScope === "states" && (
              <div className={invStyles.statesPickerBox}>
                <label className={styles.label}>Allowed Delivery States & UTs</label>
                <div className={invStyles.statesGrid}>
                  {INDIAN_STATES.map(stateName => {
                    const currentList = (form.deliveryStates || "").split(",").map(s => s.trim()).filter(Boolean);
                    const isChecked = currentList.includes(stateName);
                    return (
                      <label key={stateName} className={invStyles.stateChip}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = isChecked
                              ? currentList.filter(s => s !== stateName)
                              : [...currentList, stateName];
                            change("deliveryStates", next.join(", "));
                          }}
                        />
                        <span>{stateName}</span>
                      </label>
                    );
                  })}
                </div>
                <p className={styles.hint}>Customers from pincodes outside these selected states will be blocked from purchasing.</p>
              </div>
            )}

            {form.shippingScope === "pincodes" && (
              <div className={invStyles.pincodesBox}>
                <label className={styles.label} htmlFor="product-pincodes">Supported Delivery Pincodes</label>
                <input
                  className={styles.nameInput}
                  id="product-pincodes"
                  value={form.deliveryPincodes || ""}
                  placeholder="e.g. 721253, 700001, 700019"
                  onChange={event => change("deliveryPincodes", event.target.value)}
                />
                <p className={styles.hint}>Enter 6-digit pincodes separated by commas. Only customers matching these pincodes can purchase.</p>
              </div>
            )}

            <label className={styles.label} htmlFor="product-delivery-note">Delivery availability message (optional)</label>
            <textarea
              className={styles.nameInput}
              id="product-delivery-note"
              rows={2}
              maxLength={10000}
              value={form.deliveryNote || ""}
              placeholder="e.g. Dispatched within 24 hours in insulated protective packaging."
              onChange={event => change("deliveryNote", event.target.value)}
            />

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
          <p className={styles.count}>{products.length} {products.length === 1 ? "product" : "products"}</p>
          <div className={styles.grid}>
            {products.map(product => {
              const assignedCatIds = Array.isArray(product.categoryIds) ? product.categoryIds : [product.categoryId].filter(Boolean);
              const assignedCats = categories.filter(c => assignedCatIds.includes(c.id));
              const scopeLabel = product.shippingScope === "states" ? "📍 Specific States" : product.shippingScope === "pincodes" ? "📮 Pincodes" : "🇮🇳 All India";

              return (
                <article className={styles.card} key={product.id}>
                  <div className={styles.cardImage}>
                    {product.image ? <img src={product.image} alt={product.title} /> : <FiImage aria-hidden="true" />}
                  </div>
                  <div className={styles.cardDetails}>
                    <h2>{product.title}</h2>
                    <p className={styles.hint}>₹{product.price}</p>
                    <div className={invStyles.cardMetaBadges}>
                      {assignedCats.map(c => (
                        <span key={c.id} className={invStyles.categoryPill}>{c.name}</span>
                      ))}
                      <span className={invStyles.shippingPill}>{scopeLabel}</span>
                      <span className={product.inStock ? styles.visible : styles.hidden}>
                        {product.inStock ? "In stock" : "Sold out"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" className={styles.editButton} aria-label={`Edit ${product.title}`} disabled={saving || processing} onClick={() => openForm(product)}>
                      <FiEdit2 aria-hidden="true" /><span>Edit</span>
                    </button>
                    <button type="button" className={styles.deleteButton} aria-label={`Delete ${product.title}`} disabled={saving || processing} onClick={() => removeProduct(product)}>
                      <FiTrash2 aria-hidden="true" /><span>Delete</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
