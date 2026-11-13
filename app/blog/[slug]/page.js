import Link from "next/link";
import { notFound } from "next/navigation";
import { FaLeaf } from "react-icons/fa";
import { FiArrowLeft, FiCalendar, FiChevronRight, FiClock, FiShare2, FiUser } from "react-icons/fi";
import { prisma } from "../../../lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blog = await prisma.blogPost.findUnique({ where: { slug } });
  if (!blog || !blog.isPublished) return { title: "Blog Post | SabujKuthi Nursery" };
  return {
    title: `${blog.title} | SabujKuthi Nursery`,
    description: blog.excerpt || blog.title,
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const blog = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (!blog || !blog.isPublished) {
    notFound();
  }

  // Parse paragraphs and headings
  const blocks = blog.content.split(/\n\s*\n/).filter(Boolean);

  const wordCount = blog.content.split(/\s+/).length;
  const readTime = Math.max(2, Math.round(wordCount / 180));

  return (
    <article className={styles.articlePage}>
      <div className={styles.inner}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <FiChevronRight aria-hidden="true" />
          <Link href="/blog">Blog</Link>
          <FiChevronRight aria-hidden="true" />
          <span>{blog.title}</span>
        </nav>

        {/* Article Header */}
        <header className={styles.header}>
          {blog.category && (
            <span className={styles.categoryBadge}>
              <FaLeaf aria-hidden="true" />
              <span>{blog.category}</span>
            </span>
          )}

          <h1 className={styles.title}>{blog.title}</h1>

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <FiUser aria-hidden="true" />
              <span>{blog.author || "SabujKuthi Nursery"}</span>
            </span>
            <span>·</span>
            <span className={styles.metaItem}>
              <FiCalendar aria-hidden="true" />
              <span>
                {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </span>
            <span>·</span>
            <span className={styles.metaItem}>
              <FiClock aria-hidden="true" />
              <span>{readTime} min read</span>
            </span>
          </div>
        </header>

        {/* Cover Image */}
        {blog.coverImage && (
          <div className={styles.coverBox}>
            <img src={blog.coverImage} alt={blog.title} />
          </div>
        )}

        {/* Content Body */}
        <div className={styles.articleBody}>
          {blocks.map((block, idx) => {
            const trimmed = block.trim();
            if (trimmed.startsWith("### ")) {
              return <h3 key={idx}>{trimmed.replace("### ", "")}</h3>;
            }
            if (trimmed.startsWith("## ")) {
              return <h2 key={idx}>{trimmed.replace("## ", "")}</h2>;
            }
            if (trimmed.startsWith("- ")) {
              const items = trimmed
                .split("\n")
                .map((line) => line.replace(/^-\s*/, "").trim())
                .filter(Boolean);
              return (
                <ul key={idx}>
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              );
            }
            return <p key={idx}>{trimmed}</p>;
          })}
        </div>

        {/* Share Box */}
        <div className={styles.shareBox}>
          <div>
            <strong>Enjoyed this article? Share it with gardening friends!</strong>
          </div>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `${blog.title} - SabujKuthi Nursery`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappShare}
          >
            <FiShare2 aria-hidden="true" />
            <span>Share on WhatsApp</span>
          </a>
        </div>

        <Link href="/blog" className={styles.backLink}>
          <FiArrowLeft aria-hidden="true" />
          <span>Back to All Gardening Articles</span>
        </Link>
      </div>
    </article>
  );
}
