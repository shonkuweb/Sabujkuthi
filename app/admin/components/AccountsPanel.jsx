"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiEye,
  FiLock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiShoppingBag,
  FiSlash,
  FiUser,
  FiUsers,
  FiX,
  FiXCircle
} from "react-icons/fi";
import styles from "./AccountsPanel.module.css";

const money = (val) =>
  `₹${Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (val) => {
  if (!val) return "Never";
  try {
    return new Date(val).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return String(val);
  }
};

const formatTimeAgo = (val) => {
  if (!val) return "Never";
  const diff = Date.now() - new Date(val).getTime();
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
  return formatDate(val);
};

export default function AccountsPanel({ active }) {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    totalAccounts: 0,
    activeNowCount: 0,
    activeRecentlyCount: 0,
    bannedCount: 0,
    totalLtv: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Filters
  const [subTab, setSubTab] = useState("all"); // 'all' | 'active' | 'purchased' | 'banned'
  const [search, setSearch] = useState("");

  // Modals
  const [banModalAccount, setBanModalAccount] = useState(null);
  const [banNote, setBanNote] = useState("");
  const [banModalError, setBanModalError] = useState("");
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  const [ordersModalAccount, setOrdersModalAccount] = useState(null);

  const banDialogRef = useRef(null);
  const ordersDialogRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/accounts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load customer accounts.");
      }
      setAccounts(data.accounts || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      setError(err.message || "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      loadAccounts();
    }
  }, [active, loadAccounts]);

  // Manage native dialog backdrop and ESC key for Ban Modal
  useEffect(() => {
    const dialog = banDialogRef.current;
    if (!dialog) return;
    if (banModalAccount) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [banModalAccount]);

  // Manage native dialog for Orders Modal
  useEffect(() => {
    const dialog = ordersDialogRef.current;
    if (!dialog) return;
    if (ordersModalAccount) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [ordersModalAccount]);

  // Open Ban Modal
  const handleOpenBan = (account) => {
    setBanModalAccount(account);
    setBanNote("");
    setBanModalError("");
  };

  const handleCloseBan = () => {
    if (isSubmittingBan) return;
    setBanModalAccount(null);
    setBanNote("");
    setBanModalError("");
  };

  // Submit Ban (Enforces mandatory permanent note)
  const handleSubmitBan = async (e) => {
    e.preventDefault();
    if (!banModalAccount) return;

    const trimmed = banNote.trim();
    if (!trimmed) {
      setBanModalError("Please provide a note explaining the reason for banning this account.");
      return;
    }
    if (trimmed.length < 3) {
      setBanModalError("Please enter a descriptive note (at least 3 characters).");
      return;
    }

    setIsSubmittingBan(true);
    setBanModalError("");

    try {
      const res = await fetch(`/api/admin/accounts/${banModalAccount.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to ban account.");
      }

      showToast(`Account for ${banModalAccount.phone} banned with locked audit note.`);
      handleCloseBan();
      loadAccounts();
    } catch (err) {
      setBanModalError(err.message || "An error occurred while banning the account.");
    } finally {
      setIsSubmittingBan(false);
    }
  };

  // Unban account
  const handleUnban = async (account) => {
    const confirm = window.confirm(
      `Unban account for ${account.name || account.phone}? The customer will regain access to their account.`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/accounts/${account.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to unban account.");
      }

      showToast(`Account for ${account.phone} has been restored.`);
      loadAccounts();
    } catch (err) {
      alert(err.message || "Failed to unban account.");
    }
  };

  // Client-side filtering & search
  const filteredAccounts = accounts.filter((acc) => {
    if (subTab === "active" && !acc.isActiveNow && !acc.isActiveRecently) return false;
    if (subTab === "purchased" && acc.totalOrders === 0) return false;
    if (subTab === "banned" && !acc.isBanned) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = (acc.name || "").toLowerCase().includes(q);
      const matchPhone = acc.phone.includes(q);
      const matchState = (acc.state || "").toLowerCase().includes(q);
      const matchPincode = (acc.pincode || "").includes(q);
      const matchEmail = (acc.email || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchState || matchPincode || matchEmail;
    }

    return true;
  });

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div className={styles.toast} role="status">
          <FiCheck />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Block */}
      <div className={styles.headerBlock}>
        <h2 className={styles.title}>Customer Accounts & Activity</h2>
        <p className={styles.subtitle}>
          Monitor logged in activity, lifetime spend (LTV), purchase history, customer personal details, and account security.
        </p>
      </div>

      {/* Summary KPI Grid */}
      <div className={styles.summaryGrid}>
        <div className={styles.metricCard}>
          <div className={`${styles.metricIconWrap} ${styles.iconEmerald}`}>
            <FiUsers />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{summary.totalAccounts}</span>
            <span className={styles.metricLabel}>Total Customers</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.metricIconWrap} ${styles.iconBlue}`}>
            <FiClock />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{summary.activeNowCount}</span>
            <span className={styles.metricLabel}>Logged In (Active Now)</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.metricIconWrap} ${styles.iconPurple}`}>
            <FiDollarSign />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{money(summary.totalLtv)}</span>
            <span className={styles.metricLabel}>Total Customer LTV</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.metricIconWrap} ${styles.iconRose}`}>
            <FiSlash />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{summary.bannedCount}</span>
            <span className={styles.metricLabel}>Banned Accounts</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div className={styles.subTabBar} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "all"}
          className={`${styles.subTabBtn} ${subTab === "all" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("all")}
        >
          <span>All Accounts</span>
          <span className={styles.badgePill}>{accounts.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === "active"}
          className={`${styles.subTabBtn} ${subTab === "active" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("active")}
        >
          <span>Logged In & Active</span>
          <span className={`${styles.badgePill} ${summary.activeNowCount > 0 ? styles.badgePillActive : ""}`}>
            {summary.activeNowCount > 0 ? `${summary.activeNowCount} online` : summary.activeRecentlyCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === "purchased"}
          className={`${styles.subTabBtn} ${subTab === "purchased" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("purchased")}
        >
          <span>Purchased (LTV &gt; 0)</span>
          <span className={styles.badgePill}>
            {accounts.filter((a) => a.totalOrders > 0).length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === "banned"}
          className={`${styles.subTabBtn} ${subTab === "banned" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("banned")}
        >
          <span>Banned Accounts</span>
          <span className={`${styles.badgePill} ${summary.bannedCount > 0 ? styles.badgePillDanger : ""}`}>
            {summary.bannedCount}
          </span>
        </button>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={loadAccounts}
          disabled={loading}
          aria-label="Refresh accounts list"
          title="Refresh list"
        >
          <FiRefreshCw className={loading ? styles.spin : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchWrap}>
        <FiSearch className={styles.searchIcon} aria-hidden="true" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by customer name, phone, state, pincode, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content / List Area */}
      {loading && accounts.length === 0 ? (
        <div className={styles.emptyState}>
          <FiRefreshCw className={`${styles.emptyIcon} ${styles.spin}`} />
          <h3 className={styles.emptyTitle}>Loading customer accounts...</h3>
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <FiAlertCircle className={styles.emptyIcon} style={{ color: "#ef4444" }} />
          <h3 className={styles.emptyTitle}>Error loading accounts</h3>
          <p>{error}</p>
          <button type="button" className={styles.btnSecondary} onClick={loadAccounts} style={{ marginTop: "12px" }}>
            Retry
          </button>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className={styles.emptyState}>
          <FiUsers className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No matching accounts found</h3>
          <p>
            {search
              ? "No accounts match your search criteria. Try a different term."
              : subTab === "active"
              ? "No accounts are currently logged in or active recently."
              : subTab === "banned"
              ? "No customer accounts are banned."
              : "No customer accounts registered yet."}
          </p>
        </div>
      ) : (
        <div className={styles.accountList}>
          {filteredAccounts.map((account) => {
            const initials = (account.name || "Customer")
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase();

            return (
              <article
                key={account.id}
                className={`${styles.accountCard} ${account.isBanned ? styles.accountCardBanned : ""}`}
              >
                {/* Card Top: Identity & Status */}
                <div className={styles.cardTop}>
                  <div className={styles.userProfile}>
                    <div className={`${styles.avatar} ${account.isBanned ? styles.avatarBanned : ""}`}>
                      {account.isBanned ? <FiSlash /> : initials || <FiUser />}
                    </div>
                    <div className={styles.userMainInfo}>
                      <div className={styles.userNameRow}>
                        <h3 className={styles.userName}>
                          {account.name || <em style={{ color: "#64748b" }}>Unnamed Customer</em>}
                        </h3>
                        {/* Status Badges */}
                        {account.isActiveNow ? (
                          <span className={styles.statusPillActive}>
                            <span className={styles.pulseDot} />
                            <span>Active Now (Logged In)</span>
                          </span>
                        ) : account.isActiveRecently ? (
                          <span className={styles.statusPillRecent}>
                            <FiClock />
                            <span>Active {formatTimeAgo(account.lastActiveAt)}</span>
                          </span>
                        ) : (
                          <span className={styles.statusPillMuted}>
                            <span>Last active {formatDate(account.lastActiveAt)}</span>
                          </span>
                        )}
                      </div>
                      <span className={styles.userSubText}>
                        Registered on {formatDate(account.createdAt)}
                        {account.lastLoginAt && ` · Last logged in ${formatTimeAgo(account.lastLoginAt)}`}
                      </span>
                    </div>
                  </div>

                  <div className={styles.topBadges}>
                    {account.isBanned ? (
                      <span className={styles.statusPillBanned}>
                        <FiLock />
                        <span>Banned</span>
                      </span>
                    ) : (
                      <span className={styles.statusPillActive}>
                        <FiCheck />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Metrics Row: LTV, When Last Purchased, Activity */}
                <div className={styles.metricsRow}>
                  <div className={styles.metricBox}>
                    <span className={styles.metricBoxTitle}>Lifetime Value (LTV)</span>
                    <span className={`${styles.metricBoxValue} ${styles.ltvValue}`}>
                      {money(account.lifetimeValue)}
                    </span>
                    <span className={styles.metricBoxSub}>
                      {account.totalOrders} paid {account.totalOrders === 1 ? "order" : "orders"}
                    </span>
                  </div>

                  <div className={styles.metricBox}>
                    <span className={styles.metricBoxTitle}>Last Purchased</span>
                    <span className={styles.metricBoxValue}>
                      {account.lastPurchasedAt ? formatDate(account.lastPurchasedAt) : "No purchases yet"}
                    </span>
                    <span className={styles.metricBoxSub}>
                      {account.lastPurchasedAt
                        ? `Last ordered ${formatTimeAgo(account.lastPurchasedAt)}`
                        : "Has not placed any paid orders"}
                    </span>
                  </div>

                  <div className={styles.metricBox}>
                    <span className={styles.metricBoxTitle}>When Active</span>
                    <span className={styles.metricBoxValue}>
                      {account.isActiveNow
                        ? "Online Now"
                        : account.lastActiveAt
                        ? formatTimeAgo(account.lastActiveAt)
                        : "No recent activity"}
                    </span>
                    <span className={styles.metricBoxSub}>
                      {account.lastActiveAt ? formatDate(account.lastActiveAt) : "Activity not recorded"}
                    </span>
                  </div>
                </div>

                {/* Customer Personal Details */}
                <div className={styles.personalDetailsGrid}>
                  <div className={styles.detailItem}>
                    <FiPhone className={styles.detailItemIcon} />
                    <div>
                      <span className={styles.detailItemLabel}>Phone: </span>
                      <span>+91 {account.phone}</span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <FiMapPin className={styles.detailItemIcon} />
                    <div>
                      <span className={styles.detailItemLabel}>Region: </span>
                      <span>
                        {account.state || "Not provided"} {account.pincode ? `(${account.pincode})` : ""}
                      </span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <FiMail className={styles.detailItemIcon} />
                    <div>
                      <span className={styles.detailItemLabel}>Email: </span>
                      <span>{account.email || "Not on file"}</span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <FiShoppingBag className={styles.detailItemIcon} />
                    <div>
                      <span className={styles.detailItemLabel}>Shipping Address: </span>
                      <span>{account.address || "No saved shipping address"}</span>
                    </div>
                  </div>
                </div>

                {/* IMMUTABLE LOCKED BAN NOTE (Only if Banned) */}
                {account.isBanned && (
                  <div className={styles.banNoteBox}>
                    <div className={styles.banNoteHeader}>
                      <span className={styles.banNoteTitle}>
                        <FiLock />
                        <span>Ban Record &amp; Reason</span>
                      </span>
                      <span className={styles.banNoteBadge}>
                        <FiLock /> Permanent &amp; Locked Note
                      </span>
                    </div>
                    <p className={styles.banNoteText}>
                      "{account.banReason || "No details provided"}"
                    </p>
                    <div className={styles.banNoteFooter}>
                      <span>
                        Banned by administrator on {formatDate(account.bannedAt)}
                      </span>
                      <span className={styles.banNoteNotice}>
                        Note is immutable and cannot be edited from the admin panel.
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Actions */}
                <div className={styles.cardActions}>
                  {account.totalOrders > 0 && (
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => setOrdersModalAccount(account)}
                    >
                      <FiShoppingBag />
                      <span>View Orders ({account.totalOrders})</span>
                    </button>
                  )}

                  {account.isBanned ? (
                    <button
                      type="button"
                      className={styles.btnUnban}
                      onClick={() => handleUnban(account)}
                    >
                      <FiShield />
                      <span>Unban Customer</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnDangerOutline}
                      onClick={() => handleOpenBan(account)}
                    >
                      <FiSlash />
                      <span>Ban Account</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Ban Customer Dialog */}
      <dialog
        ref={banDialogRef}
        className={styles.modal}
        aria-labelledby="ban-modal-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!isSubmittingBan) handleCloseBan();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmittingBan) {
            handleCloseBan();
          }
        }}
      >
        {banModalAccount && (
          <div>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleBlock}>
                <div className={styles.modalIconWrap}>
                  <FiSlash />
                </div>
                <div>
                  <h3 id="ban-modal-title" className={styles.modalTitle}>
                    Ban Customer Account
                  </h3>
                  <span className={styles.modalSubtitle}>
                    {banModalAccount.name || "Customer"} · +91 {banModalAccount.phone}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={handleCloseBan}
                disabled={isSubmittingBan}
                aria-label="Close dialog"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmitBan} className={styles.modalBody}>
              {/* Important Immuntability Warning */}
              <div className={styles.warningBanner}>
                <FiAlertTriangle className={styles.warningBannerIcon} />
                <div>
                  <strong>Audit Policy Warning:</strong> Once this account is banned, this note is
                  permanently locked into the audit trail and <u>CANNOT</u> be edited or changed from
                  the admin panel. Please make sure the reason is accurate and thorough.
                </div>
              </div>

              {banModalError && (
                <div style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "13.5px", fontWeight: "600" }}>
                  {banModalError}
                </div>
              )}

              <div className={styles.formField}>
                <label htmlFor="ban-note-input" className={styles.label}>
                  Ban Note / Reason <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  id="ban-note-input"
                  className={styles.textarea}
                  rows={4}
                  placeholder="Explain why this customer account is being banned (e.g., fraudulent COD refusal, payment dispute, abusive behavior)..."
                  value={banNote}
                  onChange={(e) => setBanNote(e.target.value)}
                  required
                  disabled={isSubmittingBan}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnModalCancel}
                  onClick={handleCloseBan}
                  disabled={isSubmittingBan}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnModalBan}
                  disabled={isSubmittingBan || !banNote.trim()}
                >
                  <FiLock />
                  <span>{isSubmittingBan ? "Banning Account..." : "Confirm & Ban Account"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>

      {/* Orders History Dialog */}
      <dialog
        ref={ordersDialogRef}
        className={styles.modal}
        aria-labelledby="orders-modal-title"
        onCancel={(e) => {
          e.preventDefault();
          setOrdersModalAccount(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setOrdersModalAccount(null);
          }
        }}
      >
        {ordersModalAccount && (
          <div>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleBlock}>
                <div className={`${styles.modalIconWrap} ${styles.iconEmerald}`}>
                  <FiShoppingBag />
                </div>
                <div>
                  <h3 id="orders-modal-title" className={styles.modalTitle}>
                    Order History
                  </h3>
                  <span className={styles.modalSubtitle}>
                    {ordersModalAccount.name || "Customer"} · +91 {ordersModalAccount.phone}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setOrdersModalAccount(null)}
                aria-label="Close dialog"
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  <strong>Lifetime Spend:</strong> {money(ordersModalAccount.lifetimeValue)}
                </span>
                <span>
                  <strong>Paid Orders:</strong> {ordersModalAccount.totalOrders}
                </span>
              </div>

              {ordersModalAccount.recentOrders && ordersModalAccount.recentOrders.length > 0 ? (
                <div>
                  {ordersModalAccount.recentOrders.map((ord) => (
                    <div key={ord.id} className={styles.orderRow}>
                      <div className={styles.orderRowLeft}>
                        <span className={styles.orderReceipt}>#{ord.receipt}</span>
                        <span className={styles.orderMeta}>
                          {formatDate(ord.date)} · {ord.itemCount} {ord.itemCount === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <div className={styles.orderRowRight}>
                        <span className={styles.orderAmount}>{money(ord.total)}</span>
                        <span className={styles.orderBadge}>{ord.fulfillmentStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#64748b", textAlign: "center", padding: "20px 0" }}>
                  No paid orders recorded for this account.
                </p>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnModalCancel}
                  onClick={() => setOrdersModalAccount(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
