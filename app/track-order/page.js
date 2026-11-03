"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiLock,
  FiMapPin,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiTruck,
  FiUser
} from "react-icons/fi";
import { FaLeaf, FaWhatsapp } from "react-icons/fa";
import { useCustomer } from "../context/CustomerContext";
import { business } from "../../lib/business.mjs";
import styles from "./page.module.css";

const STAGE_DESCRIPTIONS = [
  "Your order has been confirmed and verified by our nursery team.",
  "Healthy, top-grade plant saplings are being hand-selected from our nursery beds.",
  "Packed with moist coco-peat roots and protective, shock-absorbent corrugated packaging.",
  "Handed over to our delivery courier partner with live-plant transit care labels.",
  "Your healthy plants have been delivered to your doorstep. Happy gardening!"
];

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialTrackingId = searchParams.get("trackingId") || "";

  const { customer, isAuthenticated, isLoading } = useCustomer();

  const [trackingId, setTrackingId] = useState(initialTrackingId);
  const [phone, setPhone] = useState("");
  const [recentOrders, setRecentOrders] = useState([]);

  const [trackingLoading, setTrackingLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);

  // Set default phone when customer loads
  useEffect(() => {
    if (customer?.phone && !phone) {
      setPhone(customer.phone);
    }
  }, [customer, phone]);

  // Load customer recent orders for fast tracking
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;

    async function loadRecent() {
      try {
        const res = await fetch("/api/customer/orders");
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && Array.isArray(data.orders)) {
            setRecentOrders(data.orders);
          }
        }
      } catch (err) {
        console.error("Failed to load recent orders for tracking:", err);
      }
    }

    loadRecent();
    return () => { active = false; };
  }, [isAuthenticated]);

  // Auto-search if initial trackingId and phone are available
  useEffect(() => {
    if (initialTrackingId && customer?.phone && !orderData) {
      handleTrack(initialTrackingId, customer.phone);
    }
  }, [initialTrackingId, customer]);

  const handleTrack = async (targetId, targetPhone) => {
    const idToSearch = (targetId || trackingId).trim();
    const phoneToSearch = (targetPhone || phone).trim();

    if (!idToSearch) {
      setError("Please enter a Tracking ID or Order Reference (e.g., SK-1001).");
      return;
    }

    if (!phoneToSearch) {
      setError("Please enter the 10-digit mobile number associated with the order.");
      return;
    }

    setError("");
    setTrackingLoading(true);

    try {
      const res = await fetch("/api/customer/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingId: idToSearch,
          phone: phoneToSearch
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrderData(data.order);
      } else {
        setOrderData(null);
        setError(data.message || "No matching order found for this tracking ID and phone number.");
      }
    } catch {
      setOrderData(null);
      setError("An unexpected error occurred while checking order status. Please try again.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const onSubmitForm = (e) => {
    e.preventDefault();
    handleTrack();
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Mandatory Requirement: Must be logged in to access and track
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.headerArea}>
          <div className={styles.badge}>
            <FaLeaf />
            <span>SabujKuthi Order Tracking</span>
          </div>
          <h1 className={styles.title}>Track Your Order</h1>
          <p className={styles.subtitle}>
            Monitor your plant order from nursery selection to safe delivery at your door.
          </p>
        </div>

        <div className={styles.loginRequiredCard}>
          <div className={styles.lockIconBox}>
            <FiLock />
          </div>
          <h2>Customer Login Required</h2>
          <p>
            To protect customer privacy and ensure order security, you must be logged in to your SabujKuthi account to track orders.
          </p>
          <div className={styles.loginGateActions}>
            <Link
              href={`/login?redirect=${encodeURIComponent(initialTrackingId ? `/track-order?trackingId=${initialTrackingId}` : '/track-order')}`}
              className={styles.primaryLink}
            >
              <FiUser />
              <span>Log In to Track Order</span>
            </Link>
            <Link
              href={`/login?mode=signup&redirect=${encodeURIComponent('/track-order')}`}
              className={styles.secondaryLink}
            >
              <span>Create an Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <div className={styles.badge}>
          <FaLeaf />
          <span>SabujKuthi Nursery Live Tracking</span>
        </div>
        <h1 className={styles.title}>Track Your Order</h1>
        <p className={styles.subtitle}>
          Enter your Tracking ID or Order Reference (e.g. SK-1001) along with your mobile number to view real-time fulfillment progress.
        </p>
      </div>

      {/* Tracking Search Input Card */}
      <div className={styles.trackFormCard}>
        <form onSubmit={onSubmitForm} className={styles.trackForm}>
          <div className={styles.formGroup}>
            <label htmlFor="tracking-id" className={styles.label}>
              Tracking ID / Order Reference
            </label>
            <input
              id="tracking-id"
              type="text"
              placeholder="e.g. SK-1001"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tracking-phone" className={styles.label}>
              Mobile Number
            </label>
            <input
              id="tracking-phone"
              type="tel"
              placeholder="10-digit phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.trackBtn}
            disabled={trackingLoading}
          >
            <FiSearch />
            <span>{trackingLoading ? "Tracking..." : "Track Status"}</span>
          </button>
        </form>

        {recentOrders.length > 0 && (
          <div className={styles.recentChipsArea}>
            <span className={styles.recentLabel}>Your recent orders:</span>
            {recentOrders.slice(0, 5).map((o) => (
              <button
                key={o.id}
                type="button"
                className={styles.chipBtn}
                onClick={() => {
                  setTrackingId(o.reference);
                  handleTrack(o.reference, customer?.phone || phone);
                }}
              >
                {o.reference} ({o.fulfillmentStatus || 'Confirmed'})
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className={styles.alertError} role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* Order Status Result */}
      {orderData && (
        <article className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <div>
              <h2 className={styles.orderHeading}>Order {orderData.reference}</h2>
              <p className={styles.orderMeta}>
                Placed on {new Date(orderData.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })} · Customer: <strong>{orderData.customerName}</strong>
              </p>
            </div>
            <div>
              {orderData.fulfillmentStatus === "Delivered" ? (
                <span className={styles.badgeDelivered}>
                  <FiCheckCircle /> Delivered
                </span>
              ) : (
                <span className={styles.badgeActive}>
                  <FiClock /> {orderData.fulfillmentStatus || "Confirmed"}
                </span>
              )}
            </div>
          </div>

          {/* 5-Stage Stepper / Timeline */}
          <div className={styles.timelineSection}>
            <h3 className={styles.timelineTitle}>Fulfillment Progress</h3>
            <div className={styles.stepper}>
              {orderData.stages.map((stage, idx) => {
                const isCompleted = idx < orderData.stageIndex;
                const isCurrent = idx === orderData.stageIndex;
                const itemClass = isCompleted
                  ? styles.stepCompleted
                  : isCurrent
                  ? styles.stepCurrent
                  : styles.stepPending;

                return (
                  <div key={stage.key} className={`${styles.stepItem} ${itemClass}`}>
                    <div className={styles.stepCircle}>
                      {isCompleted ? <FiCheck /> : idx + 1}
                    </div>
                    <div>
                      <p className={styles.stepLabel}>{stage.badge || stage.label}</p>
                      <p className={styles.stepDesc}>
                        {STAGE_DESCRIPTIONS[idx] || ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping & Items Breakdown */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailBox}>
              <h4 className={styles.detailBoxTitle}>
                <FiMapPin />
                <span>Delivery Destination</span>
              </h4>
              <p className={styles.detailText}>
                <strong>{orderData.customerName}</strong><br />
                {orderData.address}<br />
                PIN: {orderData.pincode}<br />
                Phone: +91 {orderData.phone}
              </p>
            </div>

            <div className={styles.detailBox}>
              <h4 className={styles.detailBoxTitle}>
                <FiShoppingBag />
                <span>Plants Ordered ({orderData.items.reduce((s, i) => s + (i.qty || 1), 0)})</span>
              </h4>
              <div className={styles.itemList}>
                {orderData.items.map((item, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    <span>
                      {item.title} {item.variant ? `(${item.variant})` : ""} × {item.qty}
                    </span>
                    <strong>₹{(Number(item.price) * item.qty).toLocaleString("en-IN")}</strong>
                  </div>
                ))}
                <div className={styles.itemRow} style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "6px", marginTop: "4px" }}>
                  <span>Delivery Shipping</span>
                  <span>{orderData.shipping === 0 ? "FREE" : `₹${orderData.shipping}`}</span>
                </div>
                <div className={styles.itemRow} style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>
                  <span>Total Amount</span>
                  <span>₹{orderData.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Support Banner */}
          <div className={styles.supportBanner}>
            <p>
              🌿 Need immediate assistance or care advice for your order <strong>{orderData.reference}</strong>?
            </p>
            <a
              href={`https://wa.me/918637054105?text=${encodeURIComponent(`Hello SabujKuthi Nursery, I would like an update on my order ${orderData.reference}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappBtn}
            >
              <FaWhatsapp />
              <span>WhatsApp Nursery</span>
            </a>
          </div>
        </article>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className={styles.container}><p style={{ textAlign: "center", padding: "40px" }}>Loading...</p></div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
