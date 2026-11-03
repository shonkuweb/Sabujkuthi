"use client";

import Link from "next/link";
import { business, whatsappUrl } from "../../lib/business.mjs";
import { FiArrowRight, FiChevronRight, FiFileText, FiHeadphones, FiMail, FiMapPin, FiPackage, FiPhone, FiRefreshCw, FiShield } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

const contactUrl = whatsappUrl;
const careLinks = [
  ["Help & Support", FiHeadphones],
  ["Shipping Info", FiPackage],
  ["Returns & Refunds", FiRefreshCw],
  ["Privacy Policy", FiShield],
  ["Terms & Conditions", FiFileText],
];

export default function SiteFooter() {
  const subscribe = (event) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    window.open(contactUrl(`Hello! I'd like to receive updates on new plants and offers. My email is ${email}`), "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="nursery-footer">
      <svg className="footer-wave-top" viewBox="0 0 500 44" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#567f25" d="M0 24C45-8 75 47 155 24S263-11 500 17V44H0Z" />
        <path fill="#103b16" d="M0 42C57 3 80 49 157 29S284-8 500 29V44H0Z" />
      </svg>
      <div className="nursery-footer-inner">
        <Link href="/" className="footer-brand" aria-label={`${business.name} home`}>
          <img className="footer-logo" src={business.footerLogoCdn || "/images/sabujkuthi-footer-logo.png"} alt={business.name} width={2172} height={724} />
        </Link>
        <div className="footer-intro">
          <p>Grow greener, live better.<br />With {business.name}.</p>
          <div className="footer-socials">
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp /></a>
            <a href={`tel:${business.phone}`} aria-label={`Call ${business.name}`}><FiPhone /></a>
          </div>
        </div>
        <div className="footer-link-columns">
          <nav aria-label="Quick links">
            <h2>Quick Links</h2>
            <ul>
              {[["Home", "/"], ["Shop All", "/collection"], ["Plant Collection", "/collection"], ["Checkout", "/checkout"], ["Contact Us", "/contact"]].map(([label, href]) => (
                <li key={label}><Link href={href}>{label}<FiChevronRight aria-hidden="true" /></Link></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Customer care">
            <h2>Customer Care</h2>
            <ul>
              {careLinks.map(([label, Icon]) => (
                <li key={label}><a href={contactUrl(`Hello, I'd like information about ${label.toLowerCase()}.`)} target="_blank" rel="noopener noreferrer"><Icon aria-hidden="true" />{label}</a></li>
              ))}
            </ul>
          </nav>
        </div>
        <section className="footer-contact" id="footer-contact" aria-labelledby="footer-contact-title">
          <h2 id="footer-contact-title">Get in Touch</h2>
          <a href={`tel:${business.phone}`}><FiPhone aria-hidden="true" /><span>{business.phoneDisplay}</span></a>
          <a href={`mailto:${business.email}`}><FiMail aria-hidden="true" /><span>{business.email}</span></a>
          <p><FiMapPin aria-hidden="true" /><span>{business.address}</span></p>
        </section>
        <section className="footer-newsletter" aria-labelledby="footer-newsletter-title">
          <h2 id="footer-newsletter-title">Stay Updated</h2>
          <p>Get the latest updates on new plants,<br />offers and more.</p>
          <form onSubmit={subscribe}>
            <FiMail aria-hidden="true" />
            <input type="email" name="email" placeholder="Enter your email" aria-label="Email for plant updates" required />
            <button type="submit">Subscribe<FiArrowRight aria-hidden="true" /></button>
          </form>
        </section>
        <div className="footer-credits">
          <p>© {new Date().getFullYear()} {business.name}. All rights reserved.</p>
          <p>Made with <span aria-label="love">♥</span> in West Bengal</p>
        </div>
      </div>
      <svg className="footer-wave-bottom" viewBox="0 0 500 60" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#315c20" d="M0 6C95 66 111 16 198 36S320 5 500 27V60H0Z" />
        <path fill="#567f25" d="M0 40C77-10 113 4 195 26S291 64 376 36S453 20 500 25V60H0Z" />
        <path fill="#234f1c" d="M0 51C104 1 130 18 218 39S346 58 500 30V60H0Z" />
      </svg>
    </footer>
  );
}
