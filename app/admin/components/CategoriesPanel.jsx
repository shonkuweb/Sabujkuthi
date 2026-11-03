"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { FiCheck, FiEdit2, FiGrid, FiImage, FiPlus, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import styles from "./CategoriesPanel.module.css";

const emptyForm = { name: "", image: "", isVisible: true };

export default function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const nameRef = useRef(null);
  const addRef = useRef(null);
  const fileRef = useRef(null);
  const imageVersion = useRef(0);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Unable to load categories.");
      setCategories(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (form) nameRef.current?.focus(); }, [form?.id, form === null]);

  const openForm = (category) => {
    imageVersion.current++;
    setForm(category ? { ...category, image: category.image || "", isVisible: category.isVisible !== false } : { ...emptyForm });
    setError("");
    setNotice("");
    setProcessing(false);
  };

  const closeForm = () => {
    imageVersion.current++;
    setForm(null);
    setError("");
    setProcessing(false);
    addRef.current?.focus();
  };

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    const version = ++imageVersion.current;
    setProcessing(true);
    try {
      const thumbnail = await imageCompression(file, { maxSizeMB: 0.35, maxWidthOrHeight: 600, useWebWorker: true });
      const image = await imageCompression.getDataUrlFromFile(thumbnail);
      if (version === imageVersion.current) setForm(current => current ? { ...current, image } : null);
    } catch {
      if (version === imageVersion.current) setError("This image could not be read. Please choose another.");
    } finally {
      if (version === imageVersion.current) setProcessing(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/categories", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save category.");
      setCategories(current => form.id ? current.map(category => category.id === form.id ? data.category : category) : [...current, data.category]);
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("store-categories");
        channel.postMessage("updated");
        channel.close();
      }
      setNotice(form.id ? "Category updated." : "Category created.");
      closeForm();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Are you sure you want to delete category "${category.name}"? Products in this category will become unassigned.`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/categories?id=${encodeURIComponent(category.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete category.");
      setCategories(current => current.filter(c => c.id !== category.id));
      setNotice("Category deleted.");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("store-categories");
        channel.postMessage("updated");
        channel.close();
      }
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <p>Create and organize your plant categories.</p>
        <button type="button" ref={addRef} className={styles.primary} onClick={() => openForm()} disabled={saving || processing || loading || !!loadError}><FiPlus aria-hidden="true" />New category</button>
      </div>
      {notice && <p className={styles.success} role="status"><FiCheck aria-hidden="true" />{notice}</p>}
      {form && (
        <form className={styles.editor} onSubmit={save} aria-label={form.id ? "Edit category" : "Create category"}>
          <div className={styles.editorHeading}>
            <h2>{form.id ? "Edit category" : "Create category"}</h2>
            <button type="button" className={styles.iconButton} onClick={closeForm} disabled={saving} aria-label="Close category form"><FiX /></button>
          </div>
          <fieldset disabled={saving} className={styles.fields}>
            <label className={styles.label} htmlFor="category-name">Category name</label>
            <input ref={nameRef} id="category-name" className={styles.nameInput} value={form.name} maxLength={80} placeholder="e.g. Adenium, Fruit Plants" required onChange={event => setForm({ ...form, name: event.target.value })} />
            <span className={styles.label}>Thumbnail</span>
            <div className={styles.imagePicker}>
              <div className={styles.preview}>{form.image ? <img src={form.image} alt="Category thumbnail preview" /> : <FiImage aria-hidden="true" />}</div>
              <div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload category thumbnail" className={styles.fileInput} onChange={chooseImage} disabled={processing} />
                <button type="button" className={styles.secondary} onClick={() => fileRef.current?.click()} disabled={processing}><FiUpload aria-hidden="true" />{processing ? "Preparing image…" : form.image ? "Change image" : "Upload image"}</button>
                <p className={styles.hint}>JPG, PNG or WebP, up to 10 MB.</p>
                {form.image && <button type="button" className={styles.textButton} onClick={() => setForm({ ...form, image: "" })} disabled={processing}>Remove image</button>}
              </div>
            </div>
            <div className={styles.visibility}>
              <div><label htmlFor="category-visible">Product visibility</label><p>Show this category’s products in the store.</p></div>
              <button id="category-visible" type="button" role="switch" aria-checked={form.isVisible} aria-label="Product visibility" className={styles.switch} onClick={() => setForm({ ...form, isVisible: !form.isVisible })}><span /></button>
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              {form.id && (
                <button type="button" className={styles.dangerButton} onClick={() => removeCategory(form)} disabled={saving || processing}>
                  <FiTrash2 aria-hidden="true" />Delete category
                </button>
              )}
              <button type="button" className={styles.secondary} onClick={closeForm}>Cancel</button>
              <button type="submit" className={styles.primary} disabled={processing}>{saving ? "Saving…" : form.id ? "Save changes" : "Create category"}</button>
            </div>
          </fieldset>
        </form>
      )}
      {loading ? <div className={styles.empty} role="status">Loading categories…</div> : loadError ? (
        <div className={styles.empty}><p role="alert">{loadError}</p><button className={styles.secondary} onClick={load}>Try again</button></div>
      ) : categories.length === 0 ? (
        !form && <div className={styles.empty}><span className={styles.emptyIcon}><FiGrid aria-hidden="true" /></span><h2>No categories yet</h2><p>Add your first category to start organizing your plants.</p><button className={styles.secondary} onClick={() => openForm()}><FiPlus aria-hidden="true" />Create category</button></div>
      ) : (
        <>
          <p className={styles.count}>{categories.length} {categories.length === 1 ? "category" : "categories"}</p>
          <div className={styles.grid}>
            {categories.map(category => (
              <article className={styles.card} key={category.id}>
                <div className={styles.cardImage}>{category.image ? <img src={category.image} alt={category.name} /> : <FiImage aria-hidden="true" />}</div>
                <div className={styles.cardDetails}><h2>{category.name}</h2><span className={category.isVisible !== false ? styles.visible : styles.hidden}>Products {category.isVisible !== false ? "visible" : "hidden"}</span></div>
                <div className={styles.cardActions}>
                  <button className={styles.editButton} type="button" onClick={() => openForm(category)} disabled={saving || processing} aria-label={`Edit ${category.name}`}><FiEdit2 aria-hidden="true" /><span>Edit</span></button>
                  <button className={styles.deleteButton} type="button" onClick={() => removeCategory(category)} disabled={saving || processing} aria-label={`Delete ${category.name}`}><FiTrash2 aria-hidden="true" /><span>Delete</span></button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
