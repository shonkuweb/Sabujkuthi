"use client";
import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { business, whatsappUrl } from "../../lib/business.mjs";
import styles from "./page.module.css";

export default function ContactForm() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = event => {
    event.preventDefault();
    if (!name.trim() || !message.trim()) { setError('Please enter your name and message.'); return; }
    setError('');
    window.location.assign(whatsappUrl(`Hello ${business.name},\nMy name is ${name.trim()}.\n\n${message.trim()}`));
  };
  return <form className={styles.form} onSubmit={submit}>
    <label htmlFor="contact-name">Your name</label>
    <input id="contact-name" autoComplete="name" placeholder="Enter your name" value={name} onChange={event => setName(event.target.value)} maxLength={80} required />
    <label htmlFor="contact-message">Your message</label>
    <textarea id="contact-message" placeholder="How can we help?" rows={5} value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} required />
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button type="submit"><FaWhatsapp aria-hidden="true" />Send via WhatsApp</button>
    <p className={styles.note}>You can review and send your message in WhatsApp.<br />{business.phoneDisplay}</p>
  </form>;
}
