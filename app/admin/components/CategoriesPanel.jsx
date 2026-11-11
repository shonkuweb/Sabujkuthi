"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCornerDownRight,
  FiEdit2,
  FiFolderPlus,
  FiGrid,
  FiImage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX
} from "react-icons/fi";
import {
  buildCategoryTree,
  flattenCategoryTree,
  getCategoryPath,
  getDescendantIds
} from "../../../lib/category-tree.mjs";
import styles from "./CategoriesPanel.module.css";

const emptyForm = {
  name: "",
  parentId: "",
  image: "",
  isVisible: true,
  isVisibleInNav: true,
  isVisibleInGrid: true,
  isVisibleInShopBy: true,
};

export default function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState(new Set());
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

  const openForm = (category, defaultParentId = null) => {
    imageVersion.current++;
    setForm(category ? {
      ...category,
      parentId: category.parentId || "",
      image: category.image || "",
      isVisible: category.isVisible !== false,
      isVisibleInNav: category.isVisibleInNav !== false,
      isVisibleInGrid: category.isVisibleInGrid !== false,
      isVisibleInShopBy: category.isVisibleInShopBy !== false,
    } : { ...emptyForm, parentId: defaultParentId || "" });
    setError("");
    setNotice("");
    setProcessing(false);
  };

  const closeForm = () => {
    imageVersion.current++;
    setForm(null);
    setError("");
    setProcessing(false);
    setIsDragging(false);
    addRef.current?.focus();
  };

  const handleFile = async (file) => {
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

  const chooseImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    handleFile(file);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        parentId: form.parentId ? String(form.parentId).trim() : null,
        isVisible: Boolean(form.isVisibleInNav || form.isVisibleInGrid || form.isVisibleInShopBy),
      };
      const response = await fetch("/api/categories", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    if (!window.confirm(`Are you sure you want to delete category "${category.name}"? Products in this category will remain available, and subcategories will be reparented.`)) return;
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

  // Build tree & parent dropdown options (excluding self & descendants)
  const tree = buildCategoryTree(categories);
  const flattened = flattenCategoryTree(tree);
  const excludedIds = form?.id ? new Set([form.id, ...getDescendantIds(form.id, categories)]) : new Set();
  const availableParents = flattened.filter(cat => !excludedIds.has(cat.id));

  const toggleCollapse = (id) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const parentIds = categories.filter(c => categories.some(ch => ch.parentId === c.id)).map(c => c.id);
    setCollapsedIds(new Set(parentIds));
  };

  const isHiddenByAncestor = (catId) => {
    const path = getCategoryPath(catId, categories);
    for (let i = 0; i < path.length - 1; i++) {
      if (collapsedIds.has(path[i].id)) return true;
    }
    return false;
  };

  // Filter categories by search or ancestor collapse
  const visibleCards = searchQuery.trim()
    ? categories.filter(c => c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : flattened.filter(cat => !isHiddenByAncestor(cat.id));

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <button
          type="button"
          ref={addRef}
          className={styles.primary}
          onClick={() => openForm()}
          disabled={saving || processing || loading || !!loadError}
        >
          <FiPlus aria-hidden="true" />
          <span>New category</span>
        </button>
      </div>

      {notice && (
        <p className={styles.success} role="status">
          <FiCheck aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}

      {form && (
        <form className={styles.editor} onSubmit={save} aria-label={form.id ? "Edit category" : "Create category"}>
          <div className={styles.editorHeading}>
            <h2>{form.id ? "Edit category" : "Create category"}</h2>
            <button type="button" className={styles.iconButton} onClick={closeForm} disabled={saving} aria-label="Close category form"><FiX /></button>
          </div>
          <fieldset disabled={saving} className={styles.fields}>
            <label className={styles.label} htmlFor="category-name">Category name</label>
            <input
              ref={nameRef}
              id="category-name"
              className={styles.nameInput}
              value={form.name}
              maxLength={80}
              placeholder="e.g. Fruit Plants, Mango, Indoor Bonsai"
              required
              onChange={event => setForm({ ...form, name: event.target.value })}
            />

            {/* Parent Category Selector */}
            <label className={styles.label} htmlFor="category-parent">Parent Category (Optional)</label>
            <select
              id="category-parent"
              className={styles.nameInput}
              value={form.parentId || ""}
              onChange={event => setForm({ ...form, parentId: event.target.value || "" })}
            >
              <option value="">None (Top-level Category)</option>
              {availableParents.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.prefix}{cat.name}
                </option>
              ))}
            </select>
            <p className={styles.hint}>Leave as None for a main category, or choose a parent to create a subcategory.</p>

            <span className={styles.label}>Thumbnail</span>
            <div
              className={`${styles.imagePicker} ${isDragging ? styles.imagePickerDragging : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
            >
              <div
                className={`${styles.preview} ${isDragging ? styles.previewDragging : ""}`}
                onClick={() => fileRef.current?.click()}
                title="Click or drag and drop image here"
              >
                {form.image ? <img src={form.image} alt="Category thumbnail preview" /> : isDragging ? <FiUpload aria-hidden="true" /> : <FiImage aria-hidden="true" />}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload category thumbnail" className={styles.fileInput} onChange={chooseImage} disabled={processing} />
                <button type="button" className={styles.secondary} onClick={() => fileRef.current?.click()} disabled={processing}><FiUpload aria-hidden="true" />{processing ? "Preparing image…" : form.image ? "Change image" : "Upload image"}</button>
                <p className={styles.hint}>JPG, PNG or WebP, up to 10 MB. Drag & drop image here.</p>
                {form.image && <button type="button" className={styles.textButton} onClick={() => setForm({ ...form, image: "" })} disabled={processing}>Remove image</button>}
              </div>
            </div>

            <div className={styles.visibility}>
              <div><label htmlFor="category-visible-nav">Visible in Navbar</label><p>Show this category in the navigation bar.</p></div>
              <button id="category-visible-nav" type="button" role="switch" aria-checked={form.isVisibleInNav} aria-label="Visible in Navbar" className={styles.switch} onClick={() => setForm({ ...form, isVisibleInNav: !form.isVisibleInNav })}><span /></button>
            </div>
            <div className={styles.visibility}>
              <div><label htmlFor="category-visible-grid">Visible in home page product grid</label><p>Show this category’s products grid on the home page.</p></div>
              <button id="category-visible-grid" type="button" role="switch" aria-checked={form.isVisibleInGrid} aria-label="Visible in home page product grid" className={styles.switch} onClick={() => setForm({ ...form, isVisibleInGrid: !form.isVisibleInGrid })}><span /></button>
            </div>
            <div className={styles.visibility}>
              <div><label htmlFor="category-visible-shopby">Visible in Shop BY category section</label><p>Show this category in the Shop By Category section.</p></div>
              <button id="category-visible-shopby" type="button" role="switch" aria-checked={form.isVisibleInShopBy} aria-label="Visible in Shop BY category section" className={styles.switch} onClick={() => setForm({ ...form, isVisibleInShopBy: !form.isVisibleInShopBy })}><span /></button>
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

      {loading ? (
        <div className={styles.empty} role="status">Loading categories…</div>
      ) : loadError ? (
        <div className={styles.empty}><p role="alert">{loadError}</p><button className={styles.secondary} onClick={load}>Try again</button></div>
      ) : categories.length === 0 ? (
        !form && <div className={styles.empty}><span className={styles.emptyIcon}><FiGrid aria-hidden="true" /></span><h2>No categories yet</h2><p>Add your first category to start organizing your plants.</p><button className={styles.secondary} onClick={() => openForm()}><FiPlus aria-hidden="true" />Create category</button></div>
      ) : (
        <>
          <div className={styles.listHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <p className={styles.count}>
                {categories.length} {categories.length === 1 ? "category" : "categories"} total
              </p>
              <div className={styles.expandControls}>
                <button type="button" className={styles.textActionBtn} onClick={expandAll}>Expand All</button>
                <span>·</span>
                <button type="button" className={styles.textActionBtn} onClick={collapseAll}>Collapse All</button>
              </div>
            </div>
            <div className={styles.searchWrap}>
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                placeholder="Search categories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.treeList}>
            {visibleCards.map((category) => {
              const path = getCategoryPath(category.id, categories);
              const isSub = Boolean(category.parentId);
              const depth = category.depth || 0;
              const childCount = categories.filter(c => c.parentId === category.id).length;
              const isCollapsed = collapsedIds.has(category.id);

              return (
                <article
                  key={category.id}
                  className={`${styles.treeCard} ${isSub ? styles.subCard : ""}`}
                  style={{ marginLeft: `${Math.min(depth, 4) * 24}px` }}
                >
                  <div className={styles.treeCardLeft}>
                    {isSub && <FiCornerDownRight className={styles.branchIcon} aria-hidden="true" />}
                    <div className={styles.cardImage}>
                      {category.image ? <img src={category.image} alt={category.name} /> : <FiImage aria-hidden="true" />}
                    </div>
                    <div className={styles.cardDetails}>
                      <div className={styles.titleRow}>
                        <h2>{category.name}</h2>
                        <span className={isSub ? styles.subBadge : styles.parentBadge}>
                          {isSub ? "Subcategory" : "Top-level"}
                        </span>
                        {childCount > 0 && (
                          <button
                            type="button"
                            className={styles.dropdownToggleBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(category.id);
                            }}
                            aria-expanded={!isCollapsed}
                            title={isCollapsed ? `Click to drop down subcategories for ${category.name}` : `Click to collapse subcategories for ${category.name}`}
                          >
                            {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
                            <span>{childCount} {childCount === 1 ? "subcategory" : "subcategories"}</span>
                          </button>
                        )}
                      </div>

                      {path.length > 1 && (
                        <div className={styles.breadcrumbTrail}>
                          {path.map((p, i) => (
                            <span key={p.id}>
                              {p.name}
                              {i < path.length - 1 && " / "}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className={styles.badges}>
                        {category.isVisibleInNav !== false && <span className={styles.visible}>Navbar</span>}
                        {category.isVisibleInGrid !== false && <span className={styles.visible}>Home Grid</span>}
                        {category.isVisibleInShopBy !== false && <span className={styles.visible}>Shop By</span>}
                        {category.isVisibleInNav === false && category.isVisibleInGrid === false && category.isVisibleInShopBy === false && (
                          <span className={styles.hidden}>Hidden</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.addSubButton}
                      type="button"
                      onClick={() => openForm(null, category.id)}
                      disabled={saving || processing}
                      title={`Add subcategory under ${category.name}`}
                    >
                      <FiFolderPlus aria-hidden="true" />
                      <span>+ Subcategory</span>
                    </button>
                    <button
                      className={styles.editButton}
                      type="button"
                      onClick={() => openForm(category)}
                      disabled={saving || processing}
                      aria-label={`Edit ${category.name}`}
                    >
                      <FiEdit2 aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      className={styles.deleteButton}
                      type="button"
                      onClick={() => removeCategory(category)}
                      disabled={saving || processing}
                      aria-label={`Delete ${category.name}`}
                    >
                      <FiTrash2 aria-hidden="true" />
                      <span>Delete</span>
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
