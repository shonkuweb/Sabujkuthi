"use client";
import { useEffect, useState } from "react";
import { FiCreditCard, FiShield } from "react-icons/fi";
import { FaUniversity, FaWallet } from "react-icons/fa";
import { SiVisa } from "react-icons/si";
import styles from "./PaymentMethods.module.css";

function UpiLogo() {
  return <svg viewBox="0 0 85 30" aria-hidden="true"><text x="0" y="24" fontFamily="Arial, sans-serif" fontSize="29" fontWeight="800" fontStyle="italic" fill="#53565a">UPI</text><path d="M66 3 61 27 74 15Z" fill="#ed7425" /><path d="M76 3 71 27 84 15Z" fill="#27883b" /></svg>;
}
function RuPayLogo() {
  return <svg viewBox="0 0 105 31" aria-hidden="true"><text x="0" y="24" fontFamily="Arial, sans-serif" fontSize="25" fontWeight="800" fontStyle="italic" fill="#173b7b">RuPay</text><path d="m84 6-5 20 14-10Z" fill="#eb772a" /><path d="m96 6-5 20 14-10Z" fill="#228846" /></svg>;
}
function CirclesLogo({ maestro = false }) {
  return <svg viewBox="0 0 58 38" aria-hidden="true"><circle cx="20" cy="19" r="18" fill="#eb001b" /><circle cx="38" cy="19" r="18" fill={maestro ? '#0099df' : '#f79e1b'} fillOpacity=".9" />{maestro && <text x="29" y="23" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#fff">maestro</text>}</svg>;
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/payments/methods', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Unavailable');
      setMethods(await response.json());
    }).catch(error => { if (error.name !== 'AbortError') setMethods(null); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const badges = methods ? [
    ...(methods.upi ? [{ label: 'UPI', logo: <UpiLogo /> }] : []),
    ...(methods.card && methods.networks.visa ? [{ label: 'Visa', logo: <SiVisa className={styles.visa} /> }] : []),
    ...(methods.card && methods.networks.mastercard ? [{ label: 'Mastercard', logo: <CirclesLogo /> }] : []),
    ...(methods.card && methods.networks.rupay ? [{ label: 'RuPay', logo: <RuPayLogo /> }] : []),
    ...(methods.card && methods.networks.maestro ? [{ label: 'Maestro', logo: <CirclesLogo maestro /> }] : []),
    ...(methods.card && !Object.values(methods.networks).some(Boolean) ? [{ label: 'Cards', logo: <FiCreditCard /> }] : []),
    ...(methods.netbanking ? [{ label: 'Net banking', logo: <FaUniversity /> }] : []),
    ...(methods.wallet ? [{ label: 'Wallets', logo: <FaWallet /> }] : []),
  ] : [];
  return <section className={styles.block} aria-label="Available payment methods">
    <FiShield className={styles.shield} aria-hidden="true" />
    <strong>Secure payments with Razorpay</strong>
    {badges.length > 0 && <ul className={styles.methods}>{badges.map(({ label, logo }) => <li key={label}><span className={styles.logo} aria-hidden="true">{logo}</span><span>{label}</span></li>)}</ul>}
    <p>{loading ? 'Loading payment options…' : badges.length ? 'Final options are shown at checkout.' : 'Available payment options are shown in Razorpay checkout.'}</p>
  </section>;
}
