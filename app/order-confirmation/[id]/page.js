"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { checkoutPost } from "../../../lib/razorpay-checkout";
import styles from "./page.module.css";
export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const token = sessionStorage.getItem(`paid-order:${id}`);
    if (!token) { setError('Open this receipt in the browser used at checkout. Please contact the nursery if you need help finding your order.'); return; }
    checkoutPost('/api/checkout/status', { orderId: id, token }).then(result => {
      if (!active) return;
      if (result.status !== 'paid') setError('Your payment is still awaiting confirmation. Return to checkout to check its status.');
      else setOrder(result.order);
    }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [id]);
  return <main className={styles.page}>{order ? <><FiCheckCircle className={styles.icon} aria-hidden="true" /><h1>Payment successful</h1><p>Your order is confirmed.</p><strong className={styles.receipt}>{order.receipt}</strong>{order.paymentMode === 'test' && <span className={styles.test}>Test payment · no real money charged</span>}<div className={styles.summary}>{order.items.map(item => <div key={JSON.stringify([item.slug,item.variant])}><span>{item.title}{item.variant ? ` · ${item.variant}` : ''} × {item.qty}</span><strong>₹{(item.unitAmount*item.qty/100).toFixed(2)}</strong></div>)}<div><span>Delivery</span><strong>{order.shipping ? `₹${(order.shipping/100).toFixed(2)}` : 'FREE'}</strong></div><div><span>Total paid</span><strong>₹{(order.total/100).toFixed(2)}</strong></div></div></> : error ? <><h1>Order confirmation</h1><p role="alert">{error}</p><Link href="/checkout">Return to checkout</Link></> : <p role="status">Checking payment confirmation…</p>}<Link className={styles.continue} href="/">Continue shopping</Link></main>;
}
