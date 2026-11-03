"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiArrowRight,
  FiCheckCircle,
  FiLogOut,
  FiPackage,
  FiPhone,
  FiShoppingBag,
  FiTruck,
  FiUser
} from "react-icons/fi";
import { FaLeaf, FaWhatsapp } from "react-icons/fa";
import { useCustomer } from "../context/CustomerContext";
import { business } from "../../lib/business.mjs";
import styles from "./page.module.css";

export default function AccountPage() {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading, logout } = useCustomer();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?redirect=/account");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!customer) return;
    let isMounted = true;

    async function loadOrders() {
      try {
        const res = await fetch("/api/customer/orders");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.orders)) {
            setOrders(data.orders);
          }
        }
      } catch (err) {
        console.error("Failed to load customer orders:", err);
      } finally {
        if (isMounted) setOrdersLoading(false);
      }
    }

    loadOrders();
    return () => { isMounted = false; };
  }, [customer]);

  if (isLoading || !customer) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <p>Loading your account details...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const initial = (customer.name ? customer.name[0] : customer.phone[0] || 'U').toUpperCase();

  return (
    <div className={styles.container}>
      {/* Profile Welcome Header */}
      <div className={styles.profileCard}>
        <div className={styles.profileLeft}>
          <div className="avatar-circle" style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: '700', color: '#ffffff'
          }}>
            {initial}
          </div>
          <div className={styles.userInfo}>
            <h1>Hello, {customer.name || 'Valued Customer'}</h1>
            <p className={styles.phone}>
              <FiPhone /> +91 {customer.phone}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={styles.logoutBtn}
          title="Sign out of your account"
        >
          <FiLogOut />
          <span>Log Out</span>
        </button>
      </div>

      {/* Quick Action Tiles */}
      <div className={styles.quickActions}>
        <Link href="/track-order" className={styles.actionTile}>
          <div className={styles.tileIconBox}>
            <FiTruck />
          </div>
          <div className={styles.tileContent}>
            <p className={styles.tileTitle}>Track Live Order</p>
            <span className={styles.tileDesc}>Check current stage & delivery status</span>
          </div>
        </Link>

        <Link href="/collection" className={styles.actionTile}>
          <div className={styles.tileIconBox}>
            <FaLeaf />
          </div>
          <div className={styles.tileContent}>
            <p className={styles.tileTitle}>Plant Collection</p>
            <span className={styles.tileDesc}>Explore nursery plants & adeniums</span>
          </div>
        </Link>

        <a
          href={business.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.actionTile}
        >
          <div className={styles.tileIconBox} style={{ background: '#ecfdf5', color: '#059669' }}>
            <FaWhatsapp />
          </div>
          <div className={styles.tileContent}>
            <p className={styles.tileTitle}>Nursery WhatsApp</p>
            <span className={styles.tileDesc}>Chat directly with our plant experts</span>
          </div>
        </a>
      </div>

      {/* Orders Section */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <FiPackage />
          <span>Your Orders</span>
        </h2>
      </div>

      {ordersLoading ? (
        <div className={styles.loadingBox}>
          <p>Fetching your past orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyOrders}>
          <div className={styles.emptyIconBox}>
            <FiShoppingBag />
          </div>
          <h3>No orders yet</h3>
          <p>You haven't placed any orders with this phone number yet. Browse our lush plant catalogue!</p>
          <Link href="/collection" className="btn-modern-primary" style={{ display: 'inline-flex', width: 'auto', padding: '12px 24px' }}>
            <span>Explore Plants</span>
            <FiArrowRight />
          </Link>
        </div>
      ) : (
        <div className={styles.ordersGrid}>
          {orders.map((order) => (
            <article key={order.id} className={styles.orderCard}>
              <div className={styles.orderHead}>
                <div>
                  <h3 className={styles.orderRef}>Order {order.reference}</h3>
                  <p className={styles.orderDate}>
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <span className={`${styles.statusBadge} ${order.fulfillmentStatus === 'Delivered' ? styles.delivered : ''}`}>
                  <FiCheckCircle />
                  <span>{order.fulfillmentStatus || 'Confirmed'}</span>
                </span>
              </div>

              <div className={styles.orderItems}>
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={styles.orderItemRow}>
                    <span className={styles.orderItemTitle}>
                      {item.title} {item.variant ? `(${item.variant})` : ''}
                    </span>
                    <span className={styles.orderItemQty}>Qty: {item.qty}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    + {order.items.length - 3} more {order.items.length - 3 === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>

              <div className={styles.orderFooter}>
                <div className={styles.orderTotal}>
                  <span>Total: ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <Link
                  href={`/track-order?trackingId=${encodeURIComponent(order.reference)}`}
                  className={styles.trackOrderLink}
                >
                  <FiTruck />
                  <span>Track Status</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
