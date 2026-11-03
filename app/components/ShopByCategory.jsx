import Link from "next/link";
import { FiArrowRight, FiImage } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import styles from "./ShopByCategory.module.css";

export default function ShopByCategory({ categories, products }) {
  if (!categories.length) return null;
  return (
    <section className={styles.section} aria-labelledby="shop-by-category-title">
      <div className={styles.intro}>
        <span className={styles.eyebrow}><FaLeaf aria-hidden="true" />Explore Our Collection</span>
        <h2 id="shop-by-category-title">Shop By Category</h2>
        <p>Find the perfect plant for your space, garden and lifestyle.</p>
      </div>
      <div className={styles.grid}>
        {categories.map(category => {
          const count = products.filter(product => product.categoryId === category.id).length;
          return (
            <Link key={category.id} href={`/category/${category.slug}`} className={styles.card} aria-label={`Shop ${category.name}`}>
              <div className={styles.image}>
                {category.image ? <img src={category.image} alt="" loading="lazy" decoding="async" /> : <FiImage aria-hidden="true" />}
              </div>
              <div className={styles.info}>
                <h3>{category.name}</h3>
                <div className={styles.cardBottom}><span>{count} {count === 1 ? "plant" : "plants"}</span><FiArrowRight aria-hidden="true" /></div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link className={styles.cta} href="/collection">Explore our plants<FiArrowRight aria-hidden="true" /></Link>
    </section>
  );
}
