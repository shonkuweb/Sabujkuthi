"use client";
import { usePathname } from "next/navigation";
import { FiArrowRight, FiShoppingCart } from "react-icons/fi";
import { useCart } from "../context/CartContext";
import styles from "./FloatingCart.module.css";

export default function FloatingCart({ hidden }) {
  const pathname = usePathname();
  const { items, isSidebarOpen, setIsSidebarOpen } = useCart();
  if (hidden || isSidebarOpen || !items.length || pathname.startsWith('/admin') || pathname === '/checkout' || pathname.startsWith('/order-confirmation')) return null;
  const count = items.reduce((total, item) => total + item.qty, 0);
  const total = items.reduce((sum, item) => sum + Math.round(Number(item.price) * 100) * item.qty, 0);
  const amount = (total / 100).toLocaleString('en-IN', { minimumFractionDigits: total % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return <button type="button" data-floating-cart className={styles.bar} onClick={() => setIsSidebarOpen(true)} aria-label={`Open your cart, ${count} ${count === 1 ? 'item' : 'items'}, ₹${amount}`}>
    <span className={styles.icon}><FiShoppingCart aria-hidden="true" /><span className={styles.count}>{count > 99 ? '99+' : count}</span></span>
    <span className={styles.label}>Your Cart</span><span className={styles.dot} aria-hidden="true">·</span>
    <strong className={styles.total}>₹{amount}</strong><FiArrowRight className={styles.arrow} aria-hidden="true" />
    <span className={styles.announcement} role="status">{count} {count === 1 ? 'item' : 'items'} in your cart. Total ₹{amount}.</span>
  </button>;
}
