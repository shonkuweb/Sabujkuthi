import { FaStar } from "react-icons/fa";
import styles from "./CustomerReviews.module.css";

const reviews = [
  {
    id: 1,
    name: "Subhashis Mukherjee",
    location: "Salt Lake, Kolkata, West Bengal",
    avatar: "SM",
    stars: 5,
    tag: "Adenium Obesum & Jasmine",
    quote: "I ordered three grafted Adeniums from SabujKuthi. They reached my flat in Salt Lake with thick, solid caudex and fresh green buds. The specialized packing kept every leaf and shoot safe during transit.",
  },
  {
    id: 2,
    name: "Mohd. Rizwan Ansari",
    location: "Hazratganj, Lucknow, Uttar Pradesh",
    avatar: "RA",
    stars: 5,
    tag: "Thai Mango & All-Time Lemon",
    quote: "Finding genuine grafted fruit saplings delivered safely to Lucknow used to be difficult. Both the mango graft and Kagzi lemon arrived in moist cocopeat with healthy, active root systems. Truly impressive quality.",
  },
  {
    id: 3,
    name: "Ananya Banerjee",
    location: "Medinipur, West Bengal",
    avatar: "AB",
    stars: 5,
    tag: "Grafted Bougainvillea & Hibiscus",
    quote: "SabujKuthi is well-known across Paschim Medinipur for authentic plant quality. Ordered online and received vibrant multi-color grafted bougainvillea. Customer support on WhatsApp even guided me on the potting mix.",
  },
  {
    id: 4,
    name: "Priya Shukla",
    location: "Gomti Nagar, Lucknow, Uttar Pradesh",
    avatar: "PS",
    stars: 5,
    tag: "Petrea Volubilis & Air Purifiers",
    quote: "The Petrea Volubilis (Sandpaper vine) arrived in superb shape. The plant was healthy and vibrant. It is hard to get such well-rooted climbing plants online. Will definitely order again for my terrace garden.",
  },
  {
    id: 5,
    name: "Meera Nair",
    location: "Indiranagar, Bengaluru, Karnataka",
    avatar: "MN",
    stars: 5,
    tag: "Adenium Arabicum Collection",
    quote: "Plant lovers know how risky online delivery can be for caudex plants. SabujKuthi's packaging was top-notch — zero stem damage and dry roots ready for potting. Within ten days, new leaves sprouted beautifully.",
  },
  {
    id: 6,
    name: "Ramesh Kulkarni",
    location: "Kothrud, Pune, Maharashtra",
    avatar: "RK",
    stars: 5,
    tag: "Rare Adenium Rosy & Dwarf Chiku",
    quote: "Prompt delivery and very honest nursery pricing. The packaging ensured no soil spill, and the plants looked as fresh as if I had picked them straight from the field myself. Highly recommended!",
  },
];

export default function CustomerReviews() {
  return (
    <section className={styles.section} aria-labelledby="customer-reviews-title">
      <h2 id="customer-reviews-title">Happy Customers Say</h2>
      <div className={styles.track} tabIndex={0} aria-label="Customer review cards, scroll horizontally">
        {reviews.map((review) => (
          <article className={styles.card} key={review.id} aria-label={`Review by ${review.name}`}>
            <div className={styles.stars} aria-hidden="true">
              {[...Array(review.stars)].map((_, i) => (
                <FaStar key={i} />
              ))}
            </div>
            <span className={styles.preview}>Verified Buyer · {review.tag}</span>
            <p className={styles.quote}>&ldquo;{review.quote}&rdquo;</p>
            <div className={styles.customer}>
              <span className={styles.avatar}>{review.avatar}</span>
              <div>
                <strong className={styles.name}>{review.name}</strong>
                <span className={styles.caption}>{review.location}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
