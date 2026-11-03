"use client";

import Link from "next/link";
import { business } from "../../lib/business.mjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiCreditCard, FiLock, FiShield } from "react-icons/fi";
import { useCart } from "../context/CartContext";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { deliveryPaise, FREE_DELIVERY_THRESHOLD } from "../../lib/shipping.mjs";
import { checkoutPost, loadRazorpay } from "../../lib/razorpay-checkout";
import styles from "./page.module.css";

const money = paise => (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CheckoutPage() {
  const router = useRouter();
  const { items, productsLoading, productsError, removePurchased } = useCart();
  const { deliverySettings } = useStoreSettings();
  const [form, setForm] = useState({ name: '', phone: '', email: '', pincode: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const attempt = useRef(null);
  const subtotal = items.reduce((sum, item) => sum + Math.round(Number(item.price) * 100) * item.qty, 0);
  const shipping = deliveryPaise(subtotal, deliverySettings);
  const total = subtotal + shipping;

  const finish = useCallback((order, token) => {
    sessionStorage.setItem(`paid-order:${order.id}`, token);
    sessionStorage.removeItem('pending-checkout');
    removePurchased(order.id, order.items);
    router.replace(`/order-confirmation/${order.id}`);
  }, [removePurchased, router]);

  useEffect(() => {
    let active = true;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem('pending-checkout') || 'null'); } catch {}
    if (saved?.orderId && saved?.token) {
      setPending(saved);
      checkoutPost('/api/checkout/status', saved).then(result => {
        if (active && result.status === 'paid') finish(result.order, saved.token);
      }).catch(() => { if (active) setMessage('A previous checkout is awaiting confirmation. Check its payment status before paying again.'); });
    }
    return () => { active = false; };
  }, [finish]);

  const checkStatus = async () => {
    if (!pending) return;
    setBusy(true); setMessage('Checking your payment…');
    try {
      const result = await checkoutPost('/api/checkout/status', pending);
      if (result.status === 'paid') finish(result.order, pending.token);
      else setMessage('No completed payment is confirmed yet. You can retry checkout using the same order.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const pay = async event => {
    event.preventDefault();
    if (busy || !items.length) return;
    setBusy(true); setMessage('Preparing secure checkout…');
    try {
      if (pending) {
        const existing = await checkoutPost('/api/checkout/status', pending);
        if (existing.status === 'paid') { finish(existing.order, pending.token); return; }
      }
      const payload = { customer: form, items: items.map(item => ({ slug: item.slug, qty: item.qty, variant: item.variant || null })), expectedTotal: total };
      const fingerprint = JSON.stringify(payload);
      if (!attempt.current || attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, token: !attempt.current && pending ? pending.token : `${crypto.randomUUID()}${crypto.randomUUID()}` };
      const token = attempt.current.token;
      // Check browser storage before opening a payment so the receipt can be recovered.
      sessionStorage.setItem('checkout-storage-check', 'ok'); sessionStorage.removeItem('checkout-storage-check');
      const Razorpay = await loadRazorpay();
      const result = await checkoutPost('/api/checkout/create', { ...payload, token });
      if (result.status === 'paid') { finish(result.order, token); return; }
      const session = { orderId: result.orderId, token };
      sessionStorage.setItem('pending-checkout', JSON.stringify(session));
      setPending(session); setTestMode(result.paymentMode === 'test');
      const checkout = new Razorpay({
        key: result.keyId, amount: result.amount, currency: result.currency,
        order_id: result.razorpayOrderId, name: business.name, description: `Order ${result.receipt}`,
        prefill: result.customer, theme: { color: '#26784a' },
        handler: async payment => {
          setMessage('Confirming your payment with Razorpay…');
          try {
            const verified = await checkoutPost('/api/checkout/verify', { ...session, ...payment });
            if (verified.status === 'paid') finish(verified.order, token);
            else setMessage('Payment is awaiting capture. Use “Check payment status” before retrying.');
          } catch (error) { setMessage(`${error.message} Check payment status before paying again.`); }
          finally { setBusy(false); }
        },
        modal: { ondismiss: async () => {
          try {
            const status = await checkoutPost('/api/checkout/status', session);
            if (status.status === 'paid') { finish(status.order, token); return; }
            setMessage('Payment checkout was closed. Your cart is saved; retry when you are ready.');
          } catch { setMessage('Checkout closed. Check payment status before retrying.'); }
          finally { setBusy(false); }
        } },
      });
      checkout.on('payment.failed', () => setMessage('Payment failed. You can retry in Razorpay or close checkout. Your cart has been kept.'));
      setMessage(result.paymentMode === 'test' ? 'Razorpay test checkout is open. No real money will be charged.' : 'Complete your payment in Razorpay.');
      checkout.open();
    } catch (error) {
      if (error.code === 'restart_checkout' || error.status === 502) attempt.current = attempt.current ? { ...attempt.current, token: `${crypto.randomUUID()}${crypto.randomUUID()}` } : null;
      setMessage(error.message || 'Unable to start payment. Please try again.'); setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.heading}><span><FiLock aria-hidden="true" />Secure checkout</span><h1>Complete Your Order</h1><p>Enter your delivery details and pay securely with Razorpay.</p></div>
      {productsLoading ? <p role="status">Loading your cart…</p> : productsError ? <p role="alert">Your cart could not be loaded. Refresh before checking out.</p> : <form onSubmit={pay}>
        <fieldset disabled={busy} className={styles.fields}>
          <section className={styles.card}><h2><span>1</span>Delivery details</h2>
            {[
              ['name', 'Full name', 'text', 'name'], ['phone', 'Mobile number', 'tel', 'tel'],
              ['email', 'Email (optional)', 'email', 'email'], ['pincode', 'Pincode', 'text', 'postal-code'],
            ].map(([key, label, type, autoComplete]) => <label className={styles.label} key={key}>{label}<input type={type} autoComplete={autoComplete} required={key !== 'email'} maxLength={key === 'pincode' ? 6 : key === 'phone' ? 16 : key === 'name' ? 100 : 254} minLength={key === 'name' ? 2 : undefined} inputMode={key === 'pincode' ? 'numeric' : undefined} pattern={key === 'pincode' ? '[1-9][0-9]{5}' : key === 'phone' ? '(\\+?91)?[6-9][0-9]{9}' : undefined} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>)}
            <label className={styles.label}>Full delivery address<textarea rows={3} autoComplete="street-address" required minLength={10} maxLength={1000} value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} placeholder="House number, street, area and city" /></label>
          </section>
          <section className={styles.card}><h2><span>2</span>Order summary</h2>
            {!items.length ? <p className={styles.empty}>Your cart is empty. <Link href="/">Browse plants</Link></p> : items.map(item => <div className={styles.line} key={JSON.stringify([item.slug, item.variant])}>{item.image && <img src={item.image} alt="" />}<div><strong>{item.title}</strong><span>{item.variant ? `${item.variant} · ` : ''}Qty: {item.qty}</span></div><strong>₹{money(Math.round(Number(item.price) * 100) * item.qty)}</strong></div>)}
            <div className={styles.totals}><p><span>Items</span><strong>₹{money(subtotal)}</strong></p><p><span>Delivery</span><strong>{shipping === 0 ? 'FREE' : `₹${money(shipping)}`}</strong></p><p className={styles.total}><span>Total payable</span><strong>₹{money(total)}</strong></p></div>
            <p className={styles.hint}>Free delivery on orders ₹{(deliverySettings?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD).toLocaleString('en-IN')} and above. Prices are checked again before payment.</p>
          </section>
          <button className={styles.pay} type="submit" disabled={!items.length || busy}><FiCreditCard aria-hidden="true" />{busy ? 'Processing…' : `Pay ₹${money(total)} with Razorpay`}</button>
        </fieldset>
      </form>}
      {message && <p className={styles.notice} role="status">{message}</p>}
      {pending && <button type="button" className={styles.statusButton} disabled={busy} onClick={checkStatus}>Check payment status</button>}
      {testMode && <p className={styles.test}>Test mode · no real money is charged</p>}
      <p className={styles.secure}><FiShield aria-hidden="true" />Orders are confirmed only after payment verification.</p>
    </main>
  );
}
