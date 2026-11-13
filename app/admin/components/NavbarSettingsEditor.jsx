"use client";

import { useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  FiArrowLeft,
  FiCheck,
  FiEdit2,
  FiImage,
  FiList,
  FiMinusCircle,
  FiNavigation,
  FiPackage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { defaultNavbarSettings } from "../../../lib/navbar-settings.mjs";
import styles from "./NavbarSettingsEditor.module.css";

const blankProduct = {
  title: "",
  price: "",
  oldPrice: "",
  inStock: true,
  description: "",
  image: "",
  categoryId: "",
};

const blankNewLink = {
  label: "",
  type: "collection", // 'collection' | 'custom'
  href: "",
  description: "",
  enabled: true,
};

export default function NavbarSettingsEditor({ onSavingChange }) {
  const [settings, setSettings] = useState(defaultNavbarSettings);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("ctas"); // 'ctas' | <itemId>
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Add New Link Form State
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState(blankNewLink);

  // Product Edit / Create Modal state
  const [editingProduct, setEditingProduct] = useState(null); // null | product object
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [targetCollectionId, setTargetCollectionId] = useState("");
  const [productSaving, setProductSaving] = useState(false);

  // Assign from Inventory selector drawer
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [navRes, prodRes, catRes] = await Promise.all([
        fetch("/api/store-settings/navbar", { cache: "no-store" }),
        fetch("/api/products?admin=1", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (navRes.ok) {
        const navData = await navRes.json();
        setSettings(navData);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setAllProducts(Array.isArray(prodData) ? prodData : []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      }
    } catch {
      setError("Unable to load navbar settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async (nextSettings) => {
    setSaving(true);
    onSavingChange?.(true);
    setError("");
    try {
      const res = await fetch("/api/store-settings/navbar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save navbar settings.");
      setSettings(data);
      setNotice("Navbar settings saved successfully!");
      setTimeout(() => setNotice(""), 3500);

      // Broadcast update across browser tabs
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("store-settings");
        channel.postMessage("refresh");
        channel.close();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  const handleUpdateCta = (id, fields) => {
    const nextItems = settings.items.map((item) =>
      item.id === id ? { ...item, ...fields } : item
    );
    setSettings({ ...settings, items: nextItems });
  };

  // Add new navbar link
  const handleAddNewLink = async (e) => {
    e.preventDefault();
    const label = newLink.label.trim();
    if (!label) {
      setError("Please provide a button label.");
      return;
    }

    const rawSlug = label
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    let finalId = rawSlug || `link-${Date.now()}`;
    let counter = 1;
    while (settings.items.some((i) => i.id === finalId)) {
      finalId = `${rawSlug}-${counter++}`;
    }

    let defaultHref = newLink.type === "collection" ? `/showcase/${finalId}` : `/${finalId}`;
    let finalHref = (newLink.href.trim() || defaultHref);
    if (!finalHref.startsWith("/") && !finalHref.startsWith("http://") && !finalHref.startsWith("https://")) {
      finalHref = `/${finalHref}`;
    }

    const createdItem = {
      id: finalId,
      label,
      href: finalHref,
      description: newLink.description.trim(),
      enabled: Boolean(newLink.enabled),
      productIds: [],
    };

    const nextItems = [...settings.items, createdItem];
    const nextSettings = { ...settings, items: nextItems };
    setSettings(nextSettings);
    setIsAddingLink(false);
    setNewLink(blankNewLink);
    await saveSettings(nextSettings);

    // Switch to this new collection's product tab immediately so admin can add products
    setActiveTab(createdItem.id);
    setNotice(`"${label}" link added! You can now assign or create products for this collection.`);
  };

  // Delete navbar link
  const handleDeleteLink = async (item) => {
    const confirmMsg = `Are you sure you want to delete the "${item.label}" navbar link? Any assigned products will remain in your general store inventory.`;
    if (!window.confirm(confirmMsg)) return;

    const nextItems = settings.items.filter((i) => i.id !== item.id);
    const nextSettings = { ...settings, items: nextItems };
    setSettings(nextSettings);
    if (activeTab === item.id) {
      setActiveTab("ctas");
    }
    await saveSettings(nextSettings);
    setNotice(`"${item.label}" link was deleted.`);
  };

  // Current active collection item
  const currentItem = settings.items.find((i) => i.id === activeTab);

  // Products assigned to the active collection
  const assignedProducts = (currentItem?.productIds || [])
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean);

  // Unassign product from current collection
  const handleRemoveFromCollection = async (productId) => {
    if (!currentItem) return;
    const nextProductIds = (currentItem.productIds || []).filter((id) => id !== productId);
    const nextItems = settings.items.map((item) =>
      item.id === currentItem.id ? { ...item, productIds: nextProductIds } : item
    );
    const nextSettings = { ...settings, items: nextItems };
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  };

  // Toggle assign product from inventory
  const handleToggleAssignProduct = async (productId) => {
    if (!currentItem) return;
    const currentIds = currentItem.productIds || [];
    const exists = currentIds.includes(productId);
    const nextProductIds = exists
      ? currentIds.filter((id) => id !== productId)
      : [...currentIds, productId];

    const nextItems = settings.items.map((item) =>
      item.id === currentItem.id ? { ...item, productIds: nextProductIds } : item
    );
    const nextSettings = { ...settings, items: nextItems };
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  };

  // Open Create Product form
  const handleOpenCreateProduct = (collectionId) => {
    setTargetCollectionId(collectionId);
    setIsNewProduct(true);
    setEditingProduct({
      ...blankProduct,
      categoryId: categories[0]?.id || "",
    });
  };

  // Open Edit Product form
  const handleOpenEditProduct = (prod, collectionId) => {
    setTargetCollectionId(collectionId);
    setIsNewProduct(false);
    setEditingProduct({ ...prod });
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditingProduct((prev) => ({ ...prev, image: event.target.result }));
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError("Failed to process image.");
    }
  };

  // Save product details directly (create or edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct.title.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!editingProduct.price || isNaN(Number(editingProduct.price))) {
      setError("Valid product price is required.");
      return;
    }

    setProductSaving(true);
    setError("");
    try {
      const res = await fetch("/api/products", {
        method: isNewProduct ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product.");

      const savedProduct = data.product;

      // Update local products list
      let nextAll = [...allProducts];
      if (isNewProduct) {
        nextAll.unshift(savedProduct);
      } else {
        nextAll = nextAll.map((p) => (p.id === savedProduct.id ? savedProduct : p));
      }
      setAllProducts(nextAll);

      // If new product created for this collection, ensure it's in collection's productIds
      if (isNewProduct && targetCollectionId) {
        const item = settings.items.find((i) => i.id === targetCollectionId);
        if (item && !(item.productIds || []).includes(savedProduct.id)) {
          const nextProductIds = [savedProduct.id, ...(item.productIds || [])];
          const nextItems = settings.items.map((i) =>
            i.id === targetCollectionId ? { ...i, productIds: nextProductIds } : i
          );
          const nextSettings = { ...settings, items: nextItems };
          setSettings(nextSettings);
          await saveSettings(nextSettings);
        }
      }

      setNotice(isNewProduct ? "Product created and added to collection!" : "Product updated!");
      setEditingProduct(null);
      setTimeout(() => setNotice(""), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setProductSaving(false);
    }
  };

  // Permanently delete product from store
  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Permanently delete "${prod.title}" from nursery inventory?`)) return;
    try {
      const res = await fetch(`/api/products?id=${prod.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unable to delete product.");
      }
      // Remove from all collections
      const nextItems = settings.items.map((item) => ({
        ...item,
        productIds: (item.productIds || []).filter((id) => id !== prod.id),
      }));
      const nextSettings = { ...settings, items: nextItems };
      setSettings(nextSettings);
      setAllProducts((prev) => prev.filter((p) => p.id !== prod.id));
      await saveSettings(nextSettings);
      setNotice(`"${prod.title}" was deleted.`);
      setTimeout(() => setNotice(""), 3500);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <p style={{ padding: 20, color: "#6a7d71" }}>Loading navbar settings...</p>;
  }

  return (
    <div className={styles.editor}>
      {/* Sub Tabs: Dynamic for all navbar links */}
      <div className={styles.subTabs}>
        <button
          type="button"
          className={`${styles.subTabBtn} ${activeTab === "ctas" ? styles.subTabBtnActive : ""}`}
          onClick={() => {
            setActiveTab("ctas");
            setEditingProduct(null);
            setIsAssigning(false);
          }}
        >
          <FiNavigation aria-hidden="true" />
          <span>Navbar CTA Links ({settings.items.length})</span>
        </button>

        {settings.items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.subTabBtn} ${activeTab === item.id ? styles.subTabBtnActive : ""}`}
            onClick={() => {
              setActiveTab(item.id);
              setEditingProduct(null);
              setIsAssigning(false);
            }}
          >
            <FiPackage aria-hidden="true" />
            <span>
              {item.label} Products ({item.productIds?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {notice && <div className={styles.alertSuccess}>{notice}</div>}
      {error && <div className={styles.alertError}>{error}</div>}

      {/* TAB 1: Navbar CTA Links & Text Editor */}
      {activeTab === "ctas" && (
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Navbar CTA Buttons & Links</h3>
              <p>Add, edit, or remove navbar buttons and configure their products or destinations.</p>
            </div>
            <div className={styles.btnGroup}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setIsAddingLink(!isAddingLink)}
              >
                <FiPlus aria-hidden="true" />
                <span>{isAddingLink ? "Cancel" : "Add New Navbar Link"}</span>
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => saveSettings(settings)}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </div>

          {/* Form to Add New Navbar Link */}
          {isAddingLink && (
            <form className={styles.addLinkFormCard} onSubmit={handleAddNewLink}>
              <div className={styles.addLinkHeader}>
                <h4>
                  <FiPlus aria-hidden="true" /> Add New Navbar Link
                </h4>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setIsAddingLink(false)}
                  aria-label="Close form"
                >
                  <FiX />
                </button>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Button Label (e.g. Indoor Plants, Summer Specials)</label>
                  <input
                    type="text"
                    required
                    value={newLink.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const slug = label
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, "");
                      setNewLink((prev) => ({
                        ...prev,
                        label,
                        href: prev.type === "collection" ? `/showcase/${slug}` : prev.href,
                      }));
                    }}
                    placeholder="e.g. Summer Specials"
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label>Link Type</label>
                  <div className={styles.typeSelectRow}>
                    <label
                      className={`${styles.typeRadioLabel} ${newLink.type === "collection" ? styles.typeRadioActive : ""}`}
                    >
                      <input
                        type="radio"
                        name="linkType"
                        value="collection"
                        checked={newLink.type === "collection"}
                        onChange={() => {
                          const slug = newLink.label
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, "-")
                            .replace(/-+/g, "-")
                            .replace(/^-|-$/g, "");
                          setNewLink((prev) => ({
                            ...prev,
                            type: "collection",
                            href: `/showcase/${slug || "collection"}`,
                          }));
                        }}
                        style={{ display: "none" }}
                      />
                      <span>Product Collection Page</span>
                    </label>

                    <label
                      className={`${styles.typeRadioLabel} ${newLink.type === "custom" ? styles.typeRadioActive : ""}`}
                    >
                      <input
                        type="radio"
                        name="linkType"
                        value="custom"
                        checked={newLink.type === "custom"}
                        onChange={() =>
                          setNewLink((prev) => ({ ...prev, type: "custom" }))
                        }
                        style={{ display: "none" }}
                      />
                      <span>Custom Page / External URL</span>
                    </label>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Destination URL / Href</label>
                  <input
                    type="text"
                    required
                    value={newLink.href}
                    onChange={(e) => setNewLink({ ...newLink, href: e.target.value })}
                    placeholder="/showcase/summer-specials or /contact"
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label>Page Description (Shown at top of page)</label>
                  <input
                    type="text"
                    value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    placeholder="Short description for the showcase..."
                    className={styles.input}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsAddingLink(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnSuccess} disabled={saving}>
                  <FiCheck aria-hidden="true" />
                  <span>Create Navbar Link</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Existing Navbar Links */}
          {settings.items.map((item) => (
            <div key={item.id} className={styles.ctaCard}>
              <div className={styles.ctaCardTop}>
                <div className={styles.ctaCardTitleWrap}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a7e72" }}>
                    Button Label:
                  </label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleUpdateCta(item.id, { label: e.target.value })}
                    className={styles.ctaLabelInput}
                    placeholder="Button label..."
                  />
                  <span
                    className={`${styles.typeBadge} ${item.href?.startsWith("/showcase/") || item.productIds?.length ? styles.badgeCollection : styles.badgeCustom}`}
                  >
                    {item.href?.startsWith("/showcase/") || item.productIds?.length
                      ? "Product Collection"
                      : "Page Link"}
                  </span>
                </div>

                <div className={styles.switchWrap}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.enabled ? "#1b5e38" : "#728479" }}>
                    {item.enabled ? "Visible in Navbar" : "Hidden"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.enabled}
                    className={styles.switch}
                    onClick={() => handleUpdateCta(item.id, { enabled: !item.enabled })}
                    title={item.enabled ? "Hide from navbar" : "Show in navbar"}
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className={styles.ctaDetailRow}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6a7e72", marginBottom: 3 }}>
                    Link URL
                  </label>
                  <input
                    type="text"
                    value={item.href}
                    onChange={(e) => handleUpdateCta(item.id, { href: e.target.value })}
                    className={styles.ctaHrefInput}
                    placeholder="/showcase/..."
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6a7e72", marginBottom: 3 }}>
                    Collection Page Description
                  </label>
                  <input
                    type="text"
                    value={item.description || ""}
                    onChange={(e) => handleUpdateCta(item.id, { description: e.target.value })}
                    className={styles.ctaDescInput}
                    placeholder="Headline description shown on the collection page..."
                  />
                </div>
              </div>

              <div className={styles.ctaActionsBar}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => {
                    setActiveTab(item.id);
                    setEditingProduct(null);
                    setIsAssigning(false);
                  }}
                  title="Manage and add products for this navbar link"
                >
                  <FiPackage aria-hidden="true" />
                  <span>
                    Manage Products ({item.productIds?.length || 0})
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => handleDeleteLink(item)}
                  title={`Delete ${item.label} link`}
                >
                  <FiTrash2 aria-hidden="true" />
                  <span>Delete Link</span>
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsAddingLink(true)}
            >
              <FiPlus aria-hidden="true" />
              <span>Add Another Link</span>
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => saveSettings(settings)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save All CTA Changes"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Product Management for ANY Active Collection Link */}
      {activeTab !== "ctas" && currentItem && (
        <div>
          {/* Header & Controls */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <div>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ marginBottom: 10 }}
                  onClick={() => setActiveTab("ctas")}
                >
                  <FiArrowLeft aria-hidden="true" />
                  <span>Back to Navbar Links</span>
                </button>
                <h3>
                  {currentItem.label} — Assigned Products ({assignedProducts.length})
                </h3>
                <p>
                  Manage the products that appear on the public <code>{currentItem.href}</code> page.
                </p>
              </div>

              <div className={styles.btnGroup}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsAssigning(!isAssigning)}
                >
                  <FiList aria-hidden="true" />
                  <span>{isAssigning ? "Close Inventory Picker" : "Assign from Inventory"}</span>
                </button>

                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => handleOpenCreateProduct(activeTab)}
                >
                  <FiPlus aria-hidden="true" />
                  <span>Create New Product</span>
                </button>
              </div>
            </div>

            {/* Description field for page header */}
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#243e2a", marginBottom: 4 }}>
                Page Header Description
              </label>
              <input
                type="text"
                value={currentItem.description || ""}
                onChange={(e) => handleUpdateCta(activeTab, { description: e.target.value })}
                onBlur={() => saveSettings(settings)}
                className={styles.input}
                placeholder="Brief description shown at the top of the collection page..."
              />
            </div>
          </div>

          {/* Assign from Inventory Panel */}
          {isAssigning && (
            <div className={styles.cardSection} style={{ background: "#f8faf8", borderStyle: "dashed" }}>
              <div className={styles.sectionHeader}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Choose Products from Inventory</h4>
                  <p>Check the products you want to feature in this navbar collection.</p>
                </div>
                <div style={{ position: "relative", minWidth: 220 }}>
                  <FiSearch style={{ position: "absolute", left: 10, top: 10, color: "#7a8d81" }} />
                  <input
                    type="text"
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    placeholder="Search inventory..."
                    className={styles.input}
                    style={{ paddingLeft: 32 }}
                  />
                </div>
              </div>

              <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {allProducts
                  .filter((p) => {
                    if (!assignSearch.trim()) return true;
                    return p.title.toLowerCase().includes(assignSearch.toLowerCase());
                  })
                  .map((p) => {
                    const isAssigned = (currentItem.productIds || []).includes(p.id);
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: isAssigned ? "#eef8f1" : "#ffffff",
                          border: "1px solid",
                          borderColor: isAssigned ? "#b8deca" : "#e3ebe5",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                        onClick={() => handleToggleAssignProduct(p.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => {}}
                            style={{ cursor: "pointer", width: 16, height: 16 }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#193524" }}>
                            {p.title}
                          </span>
                          <span style={{ fontSize: 12, color: "#6a7e71" }}>
                            ({p.category?.name || "General"})
                          </span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a5c36" }}>
                          ₹{p.price}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* List of currently assigned products */}
          <div className={styles.cardSection}>
            <div className={styles.sectionHeader}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                Products in this Collection ({assignedProducts.length})
              </h4>
            </div>

            {assignedProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <FiPackage style={{ width: 44, height: 44, color: "#9cb4a5", marginBottom: 8 }} />
                <p>No products assigned to this collection yet.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsAssigning(true)}
                  >
                    <FiList /> Assign from Existing Inventory
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => handleOpenCreateProduct(activeTab)}
                  >
                    <FiPlus /> Create New Product
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.productList}>
                {assignedProducts.map((prod) => (
                  <div key={prod.id} className={styles.productRow}>
                    <div className={styles.productInfo}>
                      {prod.image ? (
                        <img src={prod.image} alt={prod.title} className={styles.productThumb} />
                      ) : (
                        <div
                          className={styles.productThumb}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#889e90",
                          }}
                        >
                          <FiImage />
                        </div>
                      )}
                      <div>
                        <h5 className={styles.productTitle}>{prod.title}</h5>
                        <p className={styles.productMeta}>
                          {prod.category?.name || "Uncategorized"}
                          <span
                            className={`${styles.productStockBadge} ${prod.inStock ? styles.stockIn : styles.stockOut}`}
                          >
                            {prod.inStock ? "In Stock" : "Sold Out"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span className={styles.productPrice}>₹{prod.price}</span>

                      <div className={styles.btnGroup}>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onClick={() => handleOpenEditProduct(prod, activeTab)}
                          title="Edit product details"
                        >
                          <FiEdit2 aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className={styles.btnSecondary}
                          style={{ color: "#a84333" }}
                          onClick={() => handleRemoveFromCollection(prod.id)}
                          title="Remove from this collection (keeps in inventory)"
                        >
                          <FiMinusCircle aria-hidden="true" />
                          <span>Remove</span>
                        </button>

                        <button
                          type="button"
                          className={styles.btnDanger}
                          onClick={() => handleDeleteProduct(prod)}
                          title="Delete from inventory entirely"
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>{isNewProduct ? "Create Product for Collection" : "Edit Product Details"}</h4>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setEditingProduct(null)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className={styles.modalBody}>
              <div className={styles.field}>
                <label>Product Title *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className={styles.input}
                  placeholder="e.g. Organic Rose Fertilizer 1kg"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.field}>
                  <label>Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className={styles.input}
                    placeholder="250"
                  />
                </div>

                <div className={styles.field}>
                  <label>Original Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.oldPrice || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, oldPrice: e.target.value })}
                    className={styles.input}
                    placeholder="350"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.field}>
                  <label>Category *</label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className={styles.select}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Stock Status</label>
                  <select
                    value={editingProduct.inStock ? "1" : "0"}
                    onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.value === "1" })}
                    className={styles.select}
                  >
                    <option value="1">In Stock</option>
                    <option value="0">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>Product Description</label>
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className={styles.textarea}
                  placeholder="Nutrient values, application guide, package size..."
                />
              </div>

              <div className={styles.field}>
                <label>Product Image</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {editingProduct.image && (
                    <img
                      src={editingProduct.image}
                      alt="Product preview"
                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6 }}
                    />
                  )}
                  <label className={styles.btnSecondary} style={{ cursor: "pointer" }}>
                    <FiUpload />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  <input
                    type="text"
                    value={editingProduct.image || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    placeholder="or paste image URL"
                    className={styles.input}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={productSaving}>
                  {productSaving ? "Saving..." : isNewProduct ? "Create & Add" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
