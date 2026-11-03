import ContactForm from "./ContactForm";
import { business } from "../../lib/business.mjs";
import styles from "./page.module.css";

export const metadata = {
  title: 'Contact Us',
  description: `Contact ${business.name} on WhatsApp at ${business.phoneDisplay}.`,
};

export default function ContactPage() {
  return <main className={styles.page}>
    <h1>Contact Us</h1>
    <p className={styles.intro}>Have a question about our plants? Send us a message.</p>
    <ContactForm />
  </main>;
}
