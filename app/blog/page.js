"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaLeaf } from "react-icons/fa";
import { FiArrowRight, FiCalendar, FiChevronRight, FiClock, FiFileText } from "react-icons/fi";
import styles from "./page.module.css";

const CATEGORIES = ["All", "Plant Care", "Fertilizers", "Gardening Tips"];

export default function BlogListingPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const res = await fetch("/api/blogs", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setBlogs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn("Could not load blogs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBlogs();
  }, []);

  const filteredBlogs = useMemo(() => {
    if (activeCategory === "All") return blogs;
    return blogs.filter((b) => b.category === activeCategory);
  }, [blogs, activeCategory]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <FiChevronRight aria-hidden="true" />
          <span>Gardening Blog</span>
        </nav>

        {/* Hero Header */}
        <header className={styles.hero}>
          <div className={styles.badge}>
            <FaLeaf aria-hidden="true" />
            <span>Nursery Knowledge & Guides</span>
          </div>
          <h1 className={styles.title}>SabujKuthi Plant Care Blog</h1>
          <p className={styles.subtitle}>
            Practical growing advice, organic fertilizer recipes, and seasonal plant protection tips directly from our nursery grounds.
          </p>
        </header>

        {/* Category Filter Pills */}
        <div className={styles.filterBar}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterPill} ${activeCategory === cat ? styles.filterPillActive : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Blog Posts Grid */}
        {loading ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "#6a7d71" }}>
            Loading blog articles...
          </p>
        ) : filteredBlogs.length === 0 ? (
          <div className={styles.emptyState}>
            <FiFileText style={{ width: 44, height: 44, color: "#8da595", marginBottom: 12 }} />
            <h3>No articles in this category</h3>
            <p>Check back soon for new guides or browse all articles.</p>
            <button
              type="button"
              className={styles.filterPill}
              style={{ background: "#26784a", color: "#fff", borderColor: "#26784a" }}
              onClick={() => setActiveCategory("All")}
            >
              View All Articles
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredBlogs.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className={styles.card}>
                <div className={styles.cardCover}>
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} loading="lazy" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#8aa293" }}>
                      <FaLeaf style={{ width: 36, height: 36 }} />
                    </div>
                  )}
                  {post.category && <span className={styles.categoryTag}>{post.category}</span>}
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.metaInfo}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <FiCalendar aria-hidden="true" />
                      {new Date(post.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span>·</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <FiClock aria-hidden="true" />
                      {Math.max(2, Math.round((post.content?.length || 500) / 450))} min read
                    </span>
                  </div>

                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  <p className={styles.cardExcerpt}>{post.excerpt}</p>

                  <span className={styles.readMore}>
                    <span>Read Article</span>
                    <FiArrowRight aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
