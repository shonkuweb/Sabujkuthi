"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  FiCheck,
  FiEdit2,
  FiExternalLink,
  FiFileText,
  FiImage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import styles from "./BlogsPanel.module.css";

const blankBlog = {
  title: "",
  slug: "",
  category: "Plant Care",
  author: "SabujKuthi Nursery",
  excerpt: "",
  content: "",
  coverImage: "",
  isPublished: true,
};

const CATEGORIES = [
  "Plant Care",
  "Fertilizers",
  "Gardening Tips",
  "Adenium Care",
  "Nursery Updates",
  "Indoor Plants",
];

export default function BlogsPanel({ active }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fileRef = useRef(null);
  const dialogRef = useRef(null);

  const loadBlogs = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/blogs?admin=1", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load blogs.");
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  useEffect(() => {
    if (form && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [form]);

  const openNewForm = () => {
    setError("");
    setNotice("");
    setForm({ ...blankBlog });
  };

  const openEditForm = (blog) => {
    setError("");
    setNotice("");
    setForm({ ...blog });
  };

  const closeForm = () => {
    if (saving) return;
    setForm(null);
  };

  const handleTitleChange = (val) => {
    setForm((prev) => {
      const isAutoSlug =
        !prev.id ||
        prev.slug ===
          prev.title
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, "-")
            .replace(/^-|-$/g, "");
      const nextSlug = isAutoSlug
        ? val
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, "-")
            .replace(/^-|-$/g, "")
        : prev.slug;
      return { ...prev, title: val, slug: nextSlug };
    });
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1400,
        useWebWorker: true,
      });
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, coverImage: event.target.result }));
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      setError("Unable to process cover photo. Please try another image.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Please enter a blog title.");
      return;
    }
    if (!form.content.trim()) {
      setError("Please write the content for this blog post.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const isEdit = Boolean(form.id);
      const res = await fetch("/api/blogs", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save blog post.");

      setNotice(isEdit ? "Blog updated successfully!" : "Blog published successfully!");
      setForm(null);
      await loadBlogs();
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (blog) => {
    if (!window.confirm(`Are you sure you want to delete "${blog.title}"?`)) return;
    try {
      const res = await fetch(`/api/blogs?id=${blog.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Unable to delete.");
      }
      setNotice(`"${blog.title}" was deleted.`);
      await loadBlogs();
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredBlogs = blogs.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || b.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <div>
          <h2>Blog & Article Manager</h2>
          <p>Write gardening articles, plant care tutorials and updates for SabujKuthi customers.</p>
        </div>
        <button type="button" className={styles.primary} onClick={openNewForm}>
          <FiPlus aria-hidden="true" />
          <span>Write New Blog</span>
        </button>
      </div>

      {notice && (
        <div className={styles.success} role="status">
          <FiCheck aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {loadError && (
        <div className={styles.error} role="alert">
          {loadError}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filterRow}>
        <div className={styles.searchWrap}>
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={styles.select}
          style={{ width: "auto" }}
        >
          <option value="all">All Categories ({blogs.length})</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: "#6a7d71", padding: "20px 0" }}>Loading blogs...</p>
      ) : filteredBlogs.length === 0 ? (
        <div className={styles.emptyState}>
          <FiFileText style={{ width: 42, height: 42, color: "#8da495", marginBottom: 12 }} />
          <h3>No blogs found</h3>
          <p>
            {blogs.length === 0
              ? "You haven't written any blogs yet. Click 'Write New Blog' to start your first article!"
              : "No blogs match your search filters."}
          </p>
        </div>
      ) : (
        <div className={styles.blogGrid}>
          {filteredBlogs.map((b) => (
            <article key={b.id} className={styles.blogCard}>
              <div className={styles.cardCover}>
                {b.coverImage ? (
                  <img src={b.coverImage} alt={b.title} loading="lazy" />
                ) : (
                  <FiImage aria-hidden="true" style={{ width: 36, height: 36 }} />
                )}
                <span className={b.isPublished ? styles.badgePublished : styles.badgeDraft}>
                  {b.isPublished ? "Published" : "Draft"}
                </span>
                {b.category && <span className={styles.cardCategory}>{b.category}</span>}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardDate}>
                  {new Date(b.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <h3 className={styles.cardTitle}>{b.title}</h3>
                <p className={styles.cardExcerpt}>{b.excerpt}</p>

                <div className={styles.cardFooter}>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      title="Edit Blog"
                      aria-label="Edit Blog"
                      onClick={() => openEditForm(b)}
                    >
                      <FiEdit2 aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.danger}`}
                      title="Delete Blog"
                      aria-label="Delete Blog"
                      onClick={() => handleDelete(b)}
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>

                  {b.isPublished && (
                    <a
                      href={`/blog/${b.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.secondary}
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      <span>View Live</span>
                      <FiExternalLink aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {form && (
        <dialog ref={dialogRef} className={styles.modal} aria-labelledby="blog-modal-title">
          <header className={styles.modalHeader}>
            <h2 id="blog-modal-title">{form.id ? "Edit Blog Post" : "Write New Blog Post"}</h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closeForm}
              aria-label="Close"
              disabled={saving}
            >
              <FiX aria-hidden="true" />
            </button>
          </header>

          <form onSubmit={handleSave} className={styles.modalBody}>
            {error && (
              <div className={styles.error} style={{ marginTop: 0, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.fullCol}`}>
                <label htmlFor="blog-title">Article Title *</label>
                <input
                  id="blog-title"
                  type="text"
                  required
                  placeholder="e.g. Complete Guide to Adenium Desert Rose Care"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="blog-category">Category</label>
                <select
                  id="blog-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={styles.select}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="blog-author">Author</label>
                <input
                  id="blog-author"
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={`${styles.field} ${styles.fullCol}`}>
                <label htmlFor="blog-slug">URL Slug</label>
                <input
                  id="blog-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className={styles.input}
                  placeholder="adenium-care-guide"
                />
                <span className={styles.hint}>Public link: /blog/{form.slug || "slug"}</span>
              </div>

              <div className={`${styles.field} ${styles.fullCol}`}>
                <label>Cover Photo</label>
                <div className={styles.imageUploadBox}>
                  <div className={styles.imagePreview}>
                    {form.coverImage ? (
                      <img src={form.coverImage} alt="Cover preview" />
                    ) : (
                      <FiImage aria-hidden="true" style={{ width: 28, height: 28 }} />
                    )}
                  </div>
                  <div className={styles.imageMeta}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      className={styles.fileInput}
                    />
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => fileRef.current?.click()}
                    >
                      <FiUpload aria-hidden="true" />
                      <span>Upload Photo</span>
                    </button>
                    <p className={styles.hint} style={{ margin: "8px 0 0" }}>
                      Upload high quality JPG, PNG, or WebP. Or enter an image URL below:
                    </p>
                    <input
                      type="url"
                      placeholder="https://example.com/cover.jpg"
                      value={form.coverImage.startsWith("data:") ? "" : form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                      className={styles.input}
                      style={{ marginTop: 6 }}
                    />
                  </div>
                </div>
              </div>

              <div className={`${styles.field} ${styles.fullCol}`}>
                <label htmlFor="blog-excerpt">Short Summary / Excerpt</label>
                <input
                  id="blog-excerpt"
                  type="text"
                  placeholder="1-2 sentences summarizing the article for preview cards..."
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={`${styles.field} ${styles.fullCol}`}>
                <label htmlFor="blog-content">Article Content *</label>
                <textarea
                  id="blog-content"
                  required
                  placeholder="Write your article paragraphs here. Use ### for subheadings, - for bullet points, and blank lines between paragraphs."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className={styles.textarea}
                  rows={10}
                />
                <span className={styles.hint}>
                  Supports markdown headings (### Subheading) and bullet points (- Point).
                </span>
              </div>
            </div>

            <div className={styles.switchRow}>
              <div>
                <strong>Publish Immediately</strong>
                <p>Visible to all visitors on the /blog page.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isPublished}
                className={styles.switch}
                onClick={() => setForm((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
              >
                <span />
              </button>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primary} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Update Blog" : "Publish Blog"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
