import { FiStar, FiUser } from "react-icons/fi";
import styles from "./CustomerReviews.module.css";

export default function CustomerReviews() {
  return (
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <h2 id="customer-reviews-title">happy Customer Says</h2>
      <div className={styles.track} tabIndex={0} aria-label="Customer review cards, scroll horizontally">
        {[1, 2, 3].map(number => (
          <article className={styles.card} key={number} aria-label={`Review preview ${number}`}>
            <div className={styles.stars} aria-hidden="true">{[1, 2, 3, 4, 5].map(star => <FiStar key={star} />)}</div>
            <span className={styles.preview}>Review preview</span>
            <p className={styles.quote}>Customer reviews are coming soon. Real customer feedback about our plants and shopping experience will appear here.</p>
            <div className={styles.customer}>
              <span className={styles.avatar}><FiUser aria-hidden="true" /></span>
              <div><span className={styles.name}>Customer name</span><span className={styles.caption}>Preview card</span></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
