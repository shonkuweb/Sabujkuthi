"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { FiBox, FiCheck, FiEdit2, FiImage, FiPlus, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import { useCategories } from "../../hooks/useCategories";
import styles from "./CategoriesPanel.module.css";

const blank = { title: "", categoryId: "", price: "", oldPrice: "", description: "", image: "", image2: "", inStock: true, plantCare: "", deliveryReturns: "", deliveryNote: "", deliveryPincodes: "", replacementInfo: "", deliveryInfo: "", supportInfo: "", packagingInfo: "", soldLast24Hours: "", demoMetrics: true };

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
    setForm(product ? { ...blank, ...product, oldPrice: product.oldPrice || "", image: product.image || "", image2: product.image2 || "", description: product.description || "", categoryId: product.categoryId || "", ...Object.fromEntries(["plantCare", "deliveryReturns", "deliveryNote", "deliveryPincodes", "replacementInfo", "deliveryInfo", "supportInfo", "packagingInfo", "soldLast24Hours"].map(key => [key, product[key] ?? ""])) } : { ...blank });
    setError(""); setNotice(""); setProcessing(false);
  };
  const close = () => { imageVersion.current++; setForm(null); setProcessing(false); setError(""); };
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const upload = async (event, field = 'image') => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image under 10 MB."); return;
    }
    const version = ++imageVersion.current;
    setProcessing(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1200, useWebWorker: true });
      const image = await imageCompression.getDataUrlFromFile(compressed);
      if (version === imageVersion.current) setForm(current => current ? { ...current, [field]: image } : null);
    } catch { if (version === imageVersion.current) setError("Unable to read this image. Choose another image."); }
    finally { if (version === imageVersion.current) setProcessing(false); }
  };

  const save = async event => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/products", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, isPublished: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save product.");
      setProducts(current => form.id ? current.map(product => product.id === form.id ? data.product : product) : [data.product, ...current]);
      setNotice(form.id ? "Product updated." : "Product added to your store.");
      if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("store-products"); channel.postMessage("updated"); channel.close(); }
      close();
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };

  const removeProduct = async product => {
    if (!window.confirm(`Are you sure you want to delete "${product.title}"? This action cannot be undone.`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete product.");
      setProducts(current => current.filter(item => item.id !== product.id));
      setNotice("Product deleted.");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("store-products");
        channel.postMessage("updated");
        channel.close();
      }
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}><p>Manage the products displayed in your store.</p><button type="button" className={styles.primary} onClick={() => openForm()} disabled={saving || processing || loading || !!loadError || !categories.length}><FiPlus aria-hidden="true" />Add product</button></div>
      {!categories.length && <p className={styles.hint}>Create a category in the Categories tab before adding products.</p>}
      {notice && <p role="status" className={styles.success}><FiCheck aria-hidden="true" />{notice}</p>}
      {form && <form className={styles.editor} onSubmit={save} aria-label={form.id ? "Edit product" : "Add product"}>
        <div className={styles.editorHeading}><h2>{form.id ? "Edit product" : "Add product"}</h2><button type="button" className={styles.iconButton} aria-label="Close product form" onClick={close} disabled={saving}><FiX /></button></div>
        <fieldset className={styles.fields} disabled={saving}>
          <label className={styles.label} htmlFor="product-title">Product name</label>
          <input className={styles.nameInput} id="product-title" ref={nameRef} value={form.title} maxLength={120} required placeholder="Enter product name" onChange={event => change("title", event.target.value)} />
          <label className={styles.label} htmlFor="product-category">Category</label>
          <select className={styles.nameInput} id="product-category" required value={form.categoryId} onChange={event => change("categoryId", event.target.value)}><option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.isVisible === false ? " (products hidden)" : ""}</option>)}</select>
          <div className={styles.formColumns}>
            <div><label className={styles.label} htmlFor="product-price">Selling price (₹)</label><input className={styles.nameInput} id="product-price" type="number" min="0" max="10000000" step="0.01" required value={form.price} onChange={event => change("price", event.target.value)} placeholder="0.00" /></div>
            <div><label className={styles.label} htmlFor="product-old-price">Original price (₹, optional)</label><input className={styles.nameInput} id="product-old-price" type="number" min="0" max="10000000" step="0.01" value={form.oldPrice} onChange={event => change("oldPrice", event.target.value)} placeholder="Before discount" /></div>
          </div>
          <span className={styles.label}>Product images (up to 2)</span>
          <div className={styles.formColumns}>
            <div>
              <span className={styles.label} style={{ fontSize: 11, color: '#68786e', marginBottom: 6 }}>Primary image</span>
              <div className={styles.imagePicker}><div className={styles.preview}>{form.image ? <img src={form.image} alt="Product image preview" /> : <FiImage aria-hidden="true" />}</div><div><input ref={fileRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload product image" disabled={processing} onChange={e => upload(e, 'image')} /><button type="button" className={styles.secondary} disabled={processing} onClick={() => fileRef.current?.click()}><FiUpload aria-hidden="true" />{processing ? "Preparing…" : form.image ? "Change image" : "Upload image"}</button>{form.image && <button type="button" className={styles.textButton} disabled={processing} onClick={() => change("image", "")}>Remove image</button>}</div></div>
            </div>
            <div>
              <span className={styles.label} style={{ fontSize: 11, color: '#68786e', marginBottom: 6 }}>Second image (optional, carousel)</span>
              <div className={styles.imagePicker}><div className={styles.preview}>{form.image2 ? <img src={form.image2} alt="Second image preview" /> : <FiImage aria-hidden="true" />}</div><div><input ref={fileRef2} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload second product image" disabled={processing} onChange={e => upload(e, 'image2')} /><button type="button" className={styles.secondary} disabled={processing} onClick={() => fileRef2.current?.click()}><FiUpload aria-hidden="true" />{processing ? "Preparing…" : form.image2 ? "Change image" : "Upload image"}</button>{form.image2 && <button type="button" className={styles.textButton} disabled={processing} onClick={() => change("image2", "")}>Remove image</button>}</div></div>
            </div>
          </div>
          <p className={styles.hint} style={{ marginTop: -14, marginBottom: 20 }}>JPG, PNG or WebP, up to 10 MB per image. Both images will show as an interactive carousel on the product details page.</p>
          <label className={styles.label} htmlFor="product-description">Description (optional)</label>
          <textarea className={styles.nameInput} id="product-description" rows={4} maxLength={10000} value={form.description} onChange={event => change("description", event.target.value)} placeholder="Tell customers about this plant" />
          <h3 className={styles.fieldHeading}>Product information</h3>
          {[
            ['plantCare', 'Plant Care Tips', 'Watering, sunlight, soil and other care instructions'],
            ['deliveryReturns', 'Delivery & Returns', 'Delivery times and the return policy for this product'],
          ].map(([key, label, placeholder]) => <div key={key}><label className={styles.label} htmlFor={`product-${key}`}>{label}</label><textarea className={styles.nameInput} id={`product-${key}`} rows={4} maxLength={10000} value={form[key]} placeholder={placeholder} onChange={event => change(key, event.target.value)} /></div>)}
          <label className={styles.label} htmlFor="product-delivery-note">Delivery availability message</label>
          <textarea className={styles.nameInput} id="product-delivery-note" rows={2} maxLength={10000} value={form.deliveryNote} placeholder="Information to show after a pincode check" onChange={event => change('deliveryNote', event.target.value)} />
          <label className={styles.label} htmlFor="product-pincodes">Supported delivery pincodes (optional)</label>
          <input className={styles.nameInput} id="product-pincodes" value={form.deliveryPincodes} placeholder="721253, 700001" onChange={event => change('deliveryPincodes', event.target.value)} />
          <p className={styles.hint}>Leave blank to ask customers to confirm delivery with the nursery.</p>
          <h3 className={styles.fieldHeading}>Highlights below the purchase buttons</h3>
          <p className={styles.hint}>Only saved highlights are shown. Leave a field blank to hide it.</p>
          <div className={styles.formColumns}>{[
            ['replacementInfo', 'Replacement', 'Your replacement policy'],
            ['deliveryInfo', 'Delivery', 'Your delivery offer or timing'],
            ['supportInfo', 'Guidance', 'Your plant support details'],
            ['packagingInfo', 'Packaging', 'Your packaging details'],
          ].map(([key, label, placeholder]) => <div key={key}><label className={styles.label} htmlFor={`product-${key}`}>{label}</label><input className={styles.nameInput} id={`product-${key}`} value={form[key]} maxLength={10000} placeholder={placeholder} onChange={event => change(key, event.target.value)} /></div>)}</div>
          <label className={styles.label} htmlFor="product-sold-count">Sold in the last 24 hours (optional)</label>
          <input className={styles.nameInput} id="product-sold-count" type="number" min="0" max="1000000" step="1" value={form.soldLast24Hours} onChange={event => change('soldLast24Hours', event.target.value)} placeholder="Enter a verified count, or leave blank to hide" />
          <div className={styles.visibility}><div><label htmlFor="product-demo-metrics">Sample reviews & viewer count</label><p>Shows clearly labelled demo statistics on the product page.</p></div><button id="product-demo-metrics" type="button" role="switch" aria-label="Sample reviews and viewer count" aria-checked={form.demoMetrics} className={styles.switch} onClick={() => change('demoMetrics', !form.demoMetrics)}><span /></button></div>
          <div className={styles.visibility}><div><label htmlFor="product-stock">In stock</label><p>Turn off to display this product as sold out.</p></div><button id="product-stock" type="button" role="switch" aria-label="In stock" aria-checked={form.inStock} className={styles.switch} onClick={() => change("inStock", !form.inStock)}><span /></button></div>
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
      </form>}
      {loading ? <div className={styles.empty} role="status">Loading inventory…</div> : loadError ? <div className={styles.empty}><p role="alert">{loadError}</p><button type="button" className={styles.secondary} onClick={load}>Try again</button></div> : !products.length ? !form && <div className={styles.empty}><span className={styles.emptyIcon}><FiBox aria-hidden="true" /></span><h2>No products yet</h2><p>Add your first product and assign it to a category.</p></div> : <><p className={styles.count}>{products.length} {products.length === 1 ? "product" : "products"}</p><div className={styles.grid}>{products.map(product => <article className={styles.card} key={product.id}><div className={styles.cardImage}>{product.image ? <img src={product.image} alt={product.title} /> : <FiImage aria-hidden="true" />}</div><div className={styles.cardDetails}><h2>{product.title}</h2><p className={styles.hint}>{categories.find(category => category.id === product.categoryId)?.name || "Assign a category"} · ₹{product.price}</p><span className={product.inStock ? styles.visible : styles.hidden}>{product.inStock ? "In stock" : "Sold out"}</span></div><div className={styles.cardActions}><button type="button" className={styles.editButton} aria-label={`Edit ${product.title}`} disabled={saving || processing} onClick={() => openForm(product)}><FiEdit2 aria-hidden="true" /><span>Edit</span></button><button type="button" className={styles.deleteButton} aria-label={`Delete ${product.title}`} disabled={saving || processing} onClick={() => removeProduct(product)}><FiTrash2 aria-hidden="true" /><span>Delete</span></button></div></article>)}</div></>}
    </div>
  );
}
