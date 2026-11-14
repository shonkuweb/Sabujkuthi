"use client";

import { useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiAward,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiFilter,
  FiFolder,
  FiLayers,
  FiMail,
  FiMessageSquare,
  FiPackage,
  FiPercent,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiShoppingBag,
  FiSlash,
  FiTag,
  FiTrash2,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiX,
  FiXCircle
} from "react-icons/fi";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import styles from "./AffiliatePanel.module.css";

export default function AffiliatePanel({ active }) {
  const [subTab, setSubTab] = useState("requests"); // 'requests' | 'accounts' | 'programmes'

  // Data states
  const [requests, setRequests] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [approvedPartners, setApprovedPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Filters & Search
  const [requestFilter, setRequestFilter] = useState("pending"); // 'pending' | 'all' | 'approved' | 'rejected'
  const [accountSearch, setAccountSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");

  // Modals state
  const [approveModal, setApproveModal] = useState(null); // { request, couponCode, selectedProgIds }
  const [rejectModal, setRejectModal] = useState(null); // { request, reason }
  const [warningModal, setWarningModal] = useState(null); // { account, warningMessage }
  const [banModal, setBanModal] = useState(null); // { account, banMessage }
  const [programmeModal, setProgrammeModal] = useState(null); // Full programme form object
  const [savingAction, setSavingAction] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, accRes, progRes] = await Promise.all([
        fetch("/api/admin/affiliate/requests?status=all"),
        fetch("/api/admin/affiliate/accounts"),
        fetch("/api/admin/affiliate/programmes")
      ]);

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        if (reqData.success) setRequests(reqData.requests || []);
      }
      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.success) setAccounts(accData.accounts || []);
      }
      if (progRes.ok) {
        const progData = await progRes.json();
        if (progData.success) {
          setProgrammes(progData.programmes || []);
          if (Array.isArray(progData.categories)) setCategories(progData.categories);
          if (Array.isArray(progData.products)) setProducts(progData.products);
          if (Array.isArray(progData.approvedPartners)) setApprovedPartners(progData.approvedPartners);
        }
      }
    } catch {
      setError("Failed to load affiliate information. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadData();
    }
  }, [active]);

  // -------------------------------------------------------------
  // ACTIONS: REQUESTS (APPROVE / REJECT)
  // -------------------------------------------------------------
  const openApproveModal = (req) => {
    const prefix = req.name.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase() || "SK";
    const initialProgIds = programmes.filter((p) => p.status === "active").map((p) => p.id);
    setApproveModal({
      request: req,
      couponCode: `${prefix}10`,
      selectedProgIds: initialProgIds.length > 0 ? [initialProgIds[0]] : []
    });
  };

  const confirmApprove = async () => {
    if (!approveModal) return;
    setSavingAction(true);
    try {
      const res = await fetch("/api/admin/affiliate/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          id: approveModal.request.id,
          couponCode: approveModal.couponCode,
          programmeIds: approveModal.selectedProgIds
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to approve request.");
        return;
      }
      showToast(`Partner ${approveModal.request.name} approved! Coupon: ${approveModal.couponCode}`);
      setApproveModal(null);
      await loadData();
    } catch {
      alert("Network error while approving request.");
    } finally {
      setSavingAction(false);
    }
  };

  const openRejectModal = (req) => {
    setRejectModal({
      request: req,
      reason: ""
    });
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    setSavingAction(true);
    try {
      const res = await fetch("/api/admin/affiliate/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          id: rejectModal.request.id,
          reason: rejectModal.reason
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to reject application.");
        return;
      }
      showToast(`Application for ${rejectModal.request.name} declined.`);
      setRejectModal(null);
      await loadData();
    } catch {
      alert("Network error while declining application.");
    } finally {
      setSavingAction(false);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: ACCOUNTS (WARNING, BAN, UNBAN)
  // -------------------------------------------------------------
  const openWarningModal = (acc) => {
    setWarningModal({
      account: acc,
      warningMessage: acc.warningMessage || ""
    });
  };

  const confirmWarning = async () => {
    if (!warningModal) return;
    setSavingAction(true);
    try {
      const res = await fetch("/api/admin/affiliate/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "warning",
          id: warningModal.account.id,
          warningMessage: warningModal.warningMessage
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to update warning.");
        return;
      }
      showToast(warningModal.warningMessage ? "Warning notification sent to creator dashboard." : "Warning cleared.");
      setWarningModal(null);
      await loadData();
    } catch {
      alert("Network error while sending warning.");
    } finally {
      setSavingAction(false);
    }
  };

  const openBanModal = (acc) => {
    setBanModal({
      account: acc,
      banMessage: ""
    });
  };

  const confirmBan = async () => {
    if (!banModal) return;
    if (!banModal.banMessage.trim()) {
      alert("Please enter a ban message explaining the reason to the creator.");
      return;
    }
    setSavingAction(true);
    try {
      const res = await fetch("/api/admin/affiliate/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ban",
          id: banModal.account.id,
          banMessage: banModal.banMessage
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to ban account.");
        return;
      }
      showToast(`Account for ${banModal.account.name} has been banned.`);
      setBanModal(null);
      await loadData();
    } catch {
      alert("Network error while banning account.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleUnban = async (acc) => {
    if (!window.confirm(`Restore active partner status for ${acc.name}?`)) return;
    setSavingAction(true);
    try {
      const res = await fetch("/api/admin/affiliate/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unban",
          id: acc.id
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to unban account.");
        return;
      }
      showToast(`Account for ${acc.name} restored to active.`);
      await loadData();
    } catch {
      alert("Network error.");
    } finally {
      setSavingAction(false);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: PROGRAMMES (CREATE & EDIT MODAL)
  // -------------------------------------------------------------
  const openNewProgrammeModal = () => {
    setProductSearch("");
    setPartnerSearch("");
    setProgrammeModal({
      isNew: true,
      title: "",
      description: "",
      commissionType: "percentage", // 'percentage' | 'fixed'
      commissionValue: 10,
      discountType: "percentage", // 'percentage' | 'fixed'
      discountValue: 5,
      scopeType: "all", // 'all' | 'category' | 'products'
      categoryId: categories.length > 0 ? categories[0].id : "",
      productIds: [],
      minOrderValue: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      terms: "Valid on all nursery orders. Payouts processed monthly.",
      status: "active",
      partnerIds: approvedPartners.map((p) => p.id) // Default: enroll all approved partners
    });
  };

  const openEditProgrammeModal = (prog) => {
    setProductSearch("");
    setPartnerSearch("");
    setProgrammeModal({
      isNew: false,
      id: prog.id,
      title: prog.title,
      description: prog.description || "",
      commissionType: prog.commissionType || "percentage",
      commissionValue: prog.commissionValue ?? prog.commissionPercent ?? 10,
      discountType: prog.discountType || "percentage",
      discountValue: prog.discountValue ?? prog.discountPercent ?? 5,
      scopeType: prog.scopeType || "all",
      categoryId: prog.categoryId || (categories.length > 0 ? categories[0].id : ""),
      productIds: Array.isArray(prog.productIds) ? prog.productIds : [],
      minOrderValue: prog.minOrderValue || 0,
      startDate: prog.startDate || "",
      endDate: prog.endDate || "",
      terms: prog.terms || "",
      status: prog.status || "active",
      partnerIds: Array.isArray(prog.partnerIds) ? prog.partnerIds : []
    });
  };

  const saveProgramme = async () => {
    if (!programmeModal || !programmeModal.title.trim()) {
      alert("Please enter a programme title.");
      return;
    }
    setSavingAction(true);
    try {
      const method = programmeModal.isNew ? "POST" : "PATCH";
      const res = await fetch("/api/admin/affiliate/programmes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programmeModal)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to save programme.");
        return;
      }
      showToast(programmeModal.isNew ? "New affiliate programme created!" : "Programme updated successfully!");
      setProgrammeModal(null);
      await loadData();
    } catch {
      alert("Network error while saving programme.");
    } finally {
      setSavingAction(false);
    }
  };

  const deleteProgramme = async (id, title) => {
    if (!window.confirm(`Delete programme "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/affiliate/programmes?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete programme.");
        return;
      }
      showToast(`Programme "${title}" deleted.`);
      await loadData();
    } catch {
      alert("Network error.");
    }
  };

  // Filtered lists
  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length;
  const filteredRequests = requests.filter((r) => {
    if (requestFilter === "all") return true;
    return r.status === requestFilter;
  });

  const filteredAccounts = accounts.filter((a) => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    return (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q)) ||
      (a.couponCode && a.couponCode.toLowerCase().includes(q))
    );
  });

  // Filtered products for modal
  const filteredProductsForScope = products.filter((p) => {
    if (!productSearch.trim()) return true;
    return p.title.toLowerCase().includes(productSearch.toLowerCase());
  });

  // Filtered partners for modal
  const filteredPartnersForScope = approvedPartners.filter((p) => {
    if (!partnerSearch.trim()) return true;
    const q = partnerSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.phone.includes(q) || (p.couponCode && p.couponCode.toLowerCase().includes(q));
  });

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div className={styles.toast}>
          <FiCheckCircle />
          <span>{toast}</span>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className={styles.subTabBar}>
        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "requests" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("requests")}
        >
          <FiUsers />
          <span>1. Requests</span>
          {pendingRequestsCount > 0 && <span className={styles.counterBadge}>{pendingRequestsCount}</span>}
        </button>

        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "accounts" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("accounts")}
        >
          <FiUserCheck />
          <span>2. Accounts</span>
          <span className={styles.counterBadgeMuted}>{accounts.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "programmes" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("programmes")}
        >
          <FiAward />
          <span>3. Programmes</span>
          <span className={styles.counterBadgeMuted}>{programmes.length}</span>
        </button>

        <button
          type="button"
          onClick={loadData}
          className={styles.refreshBtn}
          title="Refresh Affiliate Data"
        >
          <FiRefreshCw className={loading ? styles.spinning : ""} />
        </button>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 1: REQUESTS
          ------------------------------------------------------------- */}
      {subTab === "requests" && (
        <div className={styles.panelSection}>
          <div className={styles.filterBar}>
            <div className={styles.filterButtons}>
              <button
                type="button"
                className={`${styles.filterPill} ${requestFilter === "pending" ? styles.filterPillActive : ""}`}
                onClick={() => setRequestFilter("pending")}
              >
                Pending Review ({requests.filter((r) => r.status === "pending").length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${requestFilter === "approved" ? styles.filterPillActive : ""}`}
                onClick={() => setRequestFilter("approved")}
              >
                Approved ({requests.filter((r) => r.status === "approved").length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${requestFilter === "rejected" ? styles.filterPillActive : ""}`}
                onClick={() => setRequestFilter("rejected")}
              >
                Rejected ({requests.filter((r) => r.status === "rejected").length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${requestFilter === "all" ? styles.filterPillActive : ""}`}
                onClick={() => setRequestFilter("all")}
              >
                All Applications ({requests.length})
              </button>
            </div>
          </div>

          {loading && requests.length === 0 ? (
            <div className={styles.emptyState}>Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <FiUsers className={styles.emptyIcon} />
              <p>No affiliate applications found under &ldquo;{requestFilter}&rdquo; status.</p>
            </div>
          ) : (
            <div className={styles.requestsGrid}>
              {filteredRequests.map((req) => (
                <div key={req.id} className={styles.requestCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.applicantInfo}>
                      <div className={styles.applicantAvatar}>
                        {(req.name ? req.name[0] : "A").toUpperCase()}
                      </div>
                      <div>
                        <h3 className={styles.applicantName}>{req.name}</h3>
                        <div className={styles.applicantContactRow}>
                          <span><FiPhone /> +91 {req.phone}</span>
                          <span><FiMail /> {req.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.statusPillWrap}>
                      {req.status === "pending" && <span className={styles.badgePending}>Pending Review</span>}
                      {req.status === "approved" && (
                        <span className={styles.badgeApproved}>
                          <FiCheck /> Approved ({req.couponCode})
                        </span>
                      )}
                      {req.status === "rejected" && <span className={styles.badgeRejected}>Declined</span>}
                    </div>
                  </div>

                  {/* Social Profile Links */}
                  <div className={styles.socialChannelsBox}>
                    <span className={styles.socialChannelsTitle}>Creator Social Profiles:</span>
                    <div className={styles.socialBadgesRow}>
                      {req.youtubeUrl ? (
                        <a href={req.youtubeUrl} target="_blank" rel="noopener noreferrer" className={styles.ytBadge}>
                          <FaYoutube /> YouTube <FiExternalLink />
                        </a>
                      ) : (
                        <span className={styles.noSocialBadge}>No YouTube</span>
                      )}

                      {req.instagramUrl ? (
                        <a href={req.instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.instaBadge}>
                          <FaInstagram /> Instagram <FiExternalLink />
                        </a>
                      ) : (
                        <span className={styles.noSocialBadge}>No Insta</span>
                      )}

                      {req.facebookUrl ? (
                        <a href={req.facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.fbBadge}>
                          <FaFacebook /> Facebook <FiExternalLink />
                        </a>
                      ) : (
                        <span className={styles.noSocialBadge}>No Facebook</span>
                      )}
                    </div>
                  </div>

                  {/* Message Note */}
                  {req.message && (
                    <div className={styles.applicantMessageBox}>
                      <span className={styles.messageLabel}>
                        <FiMessageSquare /> Note from Applicant:
                      </span>
                      <p className={styles.messageText}>&ldquo;{req.message}&rdquo;</p>
                    </div>
                  )}

                  {/* Date & Actions */}
                  <div className={styles.cardFooter}>
                    <span className={styles.appliedDate}>
                      Applied on {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>

                    <div className={styles.actionButtons}>
                      {req.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => openApproveModal(req)}
                            className={styles.approveBtn}
                          >
                            <FiCheck /> Approve Partner
                          </button>
                          <button
                            type="button"
                            onClick={() => openRejectModal(req)}
                            className={styles.rejectBtn}
                          >
                            <FiX /> Decline
                          </button>
                        </>
                      )}
                      {req.status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => openApproveModal(req)}
                          className={styles.reconsiderBtn}
                        >
                          Approve Application
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: ACCOUNTS (APPROVED PARTNERS)
          ------------------------------------------------------------- */}
      {subTab === "accounts" && (
        <div className={styles.panelSection}>
          <div className={styles.searchBarRow}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by creator name, mobile, or coupon code..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <span className={styles.accountCountLabel}>
              Showing {filteredAccounts.length} partner account{filteredAccounts.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading && accounts.length === 0 ? (
            <div className={styles.emptyState}>Loading partner accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className={styles.emptyState}>
              <FiUserCheck className={styles.emptyIcon} />
              <p>No active partner accounts found matching your search.</p>
            </div>
          ) : (
            <div className={styles.accountsGrid}>
              {filteredAccounts.map((acc) => {
                const isBanned = acc.status === "banned";
                const hasWarning = Boolean(acc.warningMessage);

                return (
                  <div key={acc.id} className={`${styles.accountCard} ${isBanned ? styles.accountCardBanned : ""}`}>
                    {/* Warning badge if warning is active */}
                    {hasWarning && !isBanned && (
                      <div className={styles.accountWarningPill}>
                        <FiAlertTriangle />
                        <span>Warning active: &ldquo;{acc.warningMessage}&rdquo;</span>
                      </div>
                    )}

                    {/* Ban banner if banned */}
                    {isBanned && (
                      <div className={styles.accountBannedPill}>
                        <FiSlash />
                        <span>Account Banned: &ldquo;{acc.banMessage}&rdquo;</span>
                      </div>
                    )}

                    <div className={styles.accountCardHeader}>
                      <div className={styles.accountIdentity}>
                        <div className={styles.accountAvatar}>
                          {(acc.name ? acc.name[0] : "P").toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.accountTitleRow}>
                            <h3 className={styles.accountName}>{acc.name}</h3>
                            {isBanned ? (
                              <span className={styles.bannedTag}>Banned</span>
                            ) : (
                              <span className={styles.activeTag}>Active Partner</span>
                            )}
                          </div>
                          <div className={styles.accountContact}>
                            <span><FiPhone /> +91 {acc.phone}</span>
                            <span><FiMail /> {acc.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Coupon Code Badge */}
                      <div className={styles.couponTagBox}>
                        <span className={styles.couponTagLabel}>Coupon Code</span>
                        <span className={styles.couponTagCode}>{acc.couponCode || "NONE"}</span>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className={styles.metricsRow}>
                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>Users Used Code</span>
                        <span className={styles.metricNumber}>{acc.usersCount || 0}</span>
                        <span className={styles.metricSub}>Customers</span>
                      </div>

                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>Products Sold</span>
                        <span className={styles.metricNumber}>{acc.productsSold || 0}</span>
                        <span className={styles.metricSub}>Units attributed</span>
                      </div>

                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>Total Sales</span>
                        <span className={styles.metricNumber}>
                          ₹{((acc.totalSalesPaise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className={styles.metricSub}>Delivered revenue</span>
                      </div>

                      <div className={styles.metricItem}>
                        <span className={styles.metricLabel}>Programmes Running</span>
                        <span className={styles.metricNumber}>{acc.programmesCount || 0}</span>
                        <span className={styles.metricSub}>Active campaigns</span>
                      </div>
                    </div>

                    {/* Assigned Programmes list */}
                    {acc.programmes && acc.programmes.length > 0 && (
                      <div className={styles.assignedProgrammesRow}>
                        <span className={styles.progRowLabel}>Enrolled Programmes:</span>
                        <div className={styles.progBadgesGroup}>
                          {acc.programmes.map((p) => (
                            <span key={p.id} className={styles.progPillBadge}>
                              {p.title} ({p.commissionPercent}% Comm / {p.discountPercent}% Off)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Social profiles */}
                    <div className={styles.accountSocialsRow}>
                      {acc.youtubeUrl && (
                        <a href={acc.youtubeUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLinkIcon}>
                          <FaYoutube className={styles.ytIcon} /> YouTube
                        </a>
                      )}
                      {acc.instagramUrl && (
                        <a href={acc.instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLinkIcon}>
                          <FaInstagram className={styles.instaIcon} /> Instagram
                        </a>
                      )}
                      {acc.facebookUrl && (
                        <a href={acc.facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.socialLinkIcon}>
                          <FaFacebook className={styles.fbIcon} /> Facebook
                        </a>
                      )}
                    </div>

                    {/* Admin Actions */}
                    <div className={styles.accountActionsRow}>
                      <button
                        type="button"
                        onClick={() => openWarningModal(acc)}
                        className={styles.warningActionBtn}
                        title="Send or update warning notification shown on this creator dashboard"
                      >
                        <FiAlertTriangle />
                        <span>{hasWarning ? "Edit Warning" : "Give Warning"}</span>
                      </button>

                      {isBanned ? (
                        <button
                          type="button"
                          onClick={() => handleUnban(acc)}
                          className={styles.unbanActionBtn}
                        >
                          <FiCheck /> Unban Account
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openBanModal(acc)}
                          className={styles.banActionBtn}
                          title="Ban creator with a custom ban message"
                        >
                          <FiSlash /> Ban Account
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: PROGRAMMES
          ------------------------------------------------------------- */}
      {subTab === "programmes" && (
        <div className={styles.panelSection}>
          <div className={styles.progTopBar}>
            <div>
              <h2 className={styles.sectionHeading}>Affiliate & Creator Programmes</h2>
              <p className={styles.sectionSub}>
                Set up commissions (% or fixed ₹), customer discounts, product scopes, eligibility criteria, and assign approved partners.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewProgrammeModal}
              className={styles.newProgBtn}
            >
              <FiPlus /> Create New Programme
            </button>
          </div>

          <div className={styles.programmesGrid}>
            {programmes.map((prog) => {
              const categoryMatch = categories.find((c) => c.id === prog.categoryId);
              const isFixedComm = prog.commissionType === "fixed";
              const isFixedDisc = prog.discountType === "fixed";

              return (
                <div key={prog.id} className={styles.adminProgCard}>
                  <div className={styles.progCardTop}>
                    <div>
                      <div className={styles.progCardHeaderTitleRow}>
                        <h3 className={styles.adminProgTitle}>{prog.title}</h3>
                        <span className={prog.status === "active" ? styles.badgeActiveProg : styles.badgeInactiveProg}>
                          {prog.status === "active" ? "Active" : "Paused"}
                        </span>
                      </div>
                      {/* Product Scope Tag */}
                      <div className={styles.scopeBadgeWrap}>
                        {prog.scopeType === "category" ? (
                          <span className={styles.scopeCategoryBadge}>
                            <FiFolder /> Category: {categoryMatch?.name || "Specific Category"}
                          </span>
                        ) : prog.scopeType === "products" ? (
                          <span className={styles.scopeProductsBadge}>
                            <FiPackage /> {prog.productIds?.length || 0} Specific Products
                          </span>
                        ) : (
                          <span className={styles.scopeAllBadge}>
                            <FiShoppingBag /> Store-wide (All Plants)
                          </span>
                        )}

                        {prog.minOrderValue > 0 ? (
                          <span className={styles.eligibilityBadge}>
                            Min Order: ₹{prog.minOrderValue.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className={styles.eligibilityBadge}>No Min Order</span>
                        )}

                        {prog.startDate || prog.endDate ? (
                          <span className={styles.durationBadge}>
                            <FiCalendar /> {prog.startDate || "Anytime"} → {prog.endDate || "Ongoing"}
                          </span>
                        ) : (
                          <span className={styles.durationBadge}>
                            <FiCalendar /> Ongoing / No Expiry
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.progCardActions}>
                      <button
                        type="button"
                        onClick={() => openEditProgrammeModal(prog)}
                        className={styles.progIconBtn}
                        title="Edit Programme"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProgramme(prog.id, prog.title)}
                        className={styles.progIconBtnDelete}
                        title="Delete Programme"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  {prog.description && <p className={styles.adminProgDesc}>{prog.description}</p>}

                  {/* Commission and Discount Highlights */}
                  <div className={styles.progRatesBox}>
                    <div className={styles.rateCol}>
                      <span className={styles.rateValue}>
                        {isFixedComm ? `₹${prog.commissionValue}` : `${prog.commissionValue}%`}
                      </span>
                      <span className={styles.rateLabel}>Creator Reward ({isFixedComm ? "Fixed ₹" : "Percentage"})</span>
                    </div>

                    <div className={styles.rateCol}>
                      <span className={styles.rateValue}>
                        {isFixedDisc ? `₹${prog.discountValue}` : `${prog.discountValue}%`}
                      </span>
                      <span className={styles.rateLabel}>Buyer Discount ({isFixedDisc ? "Fixed ₹" : "Percentage"})</span>
                    </div>

                    <div className={styles.rateCol}>
                      <span className={styles.rateValue}>{prog.enrolledCount || 0}</span>
                      <span className={styles.rateLabel}>Partners Promoting</span>
                    </div>
                  </div>

                  {/* Assigned Partners List */}
                  <div className={styles.partnersPromotingBox}>
                    <span className={styles.partnersPromotingLabel}>
                      Approved Partners Allowed to Promote ({prog.enrolledPartners?.length || 0}):
                    </span>
                    {prog.enrolledPartners && prog.enrolledPartners.length > 0 ? (
                      <div className={styles.partnerPillsGroup}>
                        {prog.enrolledPartners.map((partner) => (
                          <span key={partner.id} className={styles.partnerNamePill}>
                            <FiUserCheck /> {partner.name} {partner.couponCode ? `(${partner.couponCode})` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.noPartnersAssigned}>No partners assigned yet. Click Edit to assign partners.</span>
                    )}
                  </div>

                  {prog.terms && (
                    <div className={styles.adminProgTerms}>
                      <strong>Terms:</strong> {prog.terms}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 1: APPROVE REQUEST
          ------------------------------------------------------------- */}
      {approveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Approve Partner: {approveModal.request.name}</h3>
              <button
                type="button"
                onClick={() => setApproveModal(null)}
                className={styles.modalCloseBtn}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="modal-coupon">
                  Assign Unique Coupon Code <span className={styles.required}>*</span>
                </label>
                <input
                  id="modal-coupon"
                  type="text"
                  value={approveModal.couponCode}
                  onChange={(e) =>
                    setApproveModal({
                      ...approveModal,
                      couponCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                    })
                  }
                  className={styles.modalInput}
                  placeholder="e.g. PRIYA10"
                />
                <span className={styles.fieldHelp}>
                  This code will be entered by buyers at checkout and displayed in the creator&apos;s dashboard.
                </span>
              </div>

              <div className={styles.formGroup}>
                <label>Enroll in Programme(s):</label>
                <div className={styles.progCheckboxes}>
                  {programmes.map((prog) => {
                    const checked = approveModal.selectedProgIds.includes(prog.id);
                    return (
                      <label key={prog.id} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setApproveModal({
                                ...approveModal,
                                selectedProgIds: [...approveModal.selectedProgIds, prog.id]
                              });
                            } else {
                              setApproveModal({
                                ...approveModal,
                                selectedProgIds: approveModal.selectedProgIds.filter((id) => id !== prog.id)
                              });
                            }
                          }}
                        />
                        <span>
                          <strong>{prog.title}</strong> ({prog.commissionValue}{prog.commissionType === "fixed" ? "₹" : "%"} Comm / {prog.discountValue}{prog.discountType === "fixed" ? "₹" : "%"} Discount)
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setApproveModal(null)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction || !approveModal.couponCode.trim()}
                onClick={confirmApprove}
                className={styles.modalConfirmBtn}
              >
                {savingAction ? "Approving..." : "Confirm & Approve Partner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: REJECT REQUEST
          ------------------------------------------------------------- */}
      {rejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Decline Application: {rejectModal.request.name}</h3>
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className={styles.modalCloseBtn}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="reject-reason">Feedback / Reason (Optional):</label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="e.g. Currently seeking active gardening channels with 1k+ subscribers..."
                  className={styles.modalTextarea}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={confirmReject}
                className={styles.modalDangerBtn}
              >
                {savingAction ? "Declining..." : "Decline Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 3: WARNING NOTIFICATION
          ------------------------------------------------------------- */}
      {warningModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>
                <FiAlertTriangle className={styles.modalWarnIcon} />
                <span>Creator Warning Notice: {warningModal.account.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setWarningModal(null)}
                className={styles.modalCloseBtn}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                This warning notification will be highlighted prominently at the very top of this creator&apos;s affiliate dashboard.
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="warning-text">Warning Notification Message:</label>
                <textarea
                  id="warning-text"
                  rows={4}
                  value={warningModal.warningMessage}
                  onChange={(e) => setWarningModal({ ...warningModal, warningMessage: e.target.value })}
                  placeholder="e.g. Please ensure you update your video descriptions to cite the official SabujKuthi nursery website..."
                  className={styles.modalTextarea}
                />
                <span className={styles.fieldHelp}>
                  Leave blank and click &ldquo;Save Notification&rdquo; if you wish to clear/remove the warning.
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setWarningModal(null)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction}
                onClick={confirmWarning}
                className={styles.modalConfirmBtn}
              >
                {savingAction ? "Saving..." : "Save Warning Notification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 4: BAN ACCOUNT
          ------------------------------------------------------------- */}
      {banModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.dangerHeader}>
                <FiSlash />
                <span>Ban Partner Account: {banModal.account.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setBanModal(null)}
                className={styles.modalCloseBtn}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Banning this account immediately revokes coupon validity and displays your custom ban message directly to the creator when they log in.
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="ban-message">
                  Ban Message (Shown to Creator) <span className={styles.required}>*</span>
                </label>
                <textarea
                  id="ban-message"
                  rows={4}
                  required
                  value={banModal.banMessage}
                  onChange={(e) => setBanModal({ ...banModal, banMessage: e.target.value })}
                  placeholder="e.g. Your affiliate account has been suspended due to policy violations regarding artificial discount advertising."
                  className={styles.modalTextarea}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setBanModal(null)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction || !banModal.banMessage.trim()}
                onClick={confirmBan}
                className={styles.modalDangerBtn}
              >
                {savingAction ? "Banning..." : "Confirm & Ban Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 5: ENHANCED PROGRAMME CREATE / EDIT
          ------------------------------------------------------------- */}
      {programmeModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.modalLarge}`}>
            <div className={styles.modalHeader}>
              <h3>{programmeModal.isNew ? "Create New Affiliate Programme" : "Edit Programme"}</h3>
              <button
                type="button"
                onClick={() => setProgrammeModal(null)}
                className={styles.modalCloseBtn}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* 1. Programme Title */}
              <div className={styles.formGroup}>
                <label htmlFor="prog-title">
                  Programme Title <span className={styles.required}>*</span>
                </label>
                <input
                  id="prog-title"
                  type="text"
                  required
                  value={programmeModal.title}
                  onChange={(e) => setProgrammeModal({ ...programmeModal, title: e.target.value })}
                  placeholder="e.g. Monsoon Adenium Special Campaign"
                  className={styles.modalInput}
                />
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label htmlFor="prog-desc">Campaign Description / Notes:</label>
                <textarea
                  id="prog-desc"
                  rows={2}
                  value={programmeModal.description}
                  onChange={(e) => setProgrammeModal({ ...programmeModal, description: e.target.value })}
                  placeholder="Goals, product highlights, seasonal plant recommendations..."
                  className={styles.modalTextarea}
                />
              </div>

              {/* 2. Creator Reward & Customer Discount in a 2-col box */}
              <div className={styles.twoColModal}>
                {/* Creator Commission */}
                <div className={styles.formGroup}>
                  <label htmlFor="prog-comm-val">
                    Creator Reward <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWithSelectWrap}>
                    <select
                      value={programmeModal.commissionType}
                      onChange={(e) => setProgrammeModal({ ...programmeModal, commissionType: e.target.value })}
                      className={styles.prefixSelect}
                    >
                      <option value="percentage">% Percentage</option>
                      <option value="fixed">₹ Fixed Amount</option>
                    </select>
                    <input
                      id="prog-comm-val"
                      type="number"
                      min={0}
                      step={programmeModal.commissionType === "fixed" ? 1 : 0.5}
                      value={programmeModal.commissionValue}
                      onChange={(e) => setProgrammeModal({ ...programmeModal, commissionValue: Number(e.target.value) })}
                      className={styles.modalInputCombined}
                    />
                  </div>
                  <span className={styles.fieldHelp}>
                    {programmeModal.commissionType === "percentage"
                      ? `Creator earns ${programmeModal.commissionValue}% on order subtotal`
                      : `Creator earns ₹${programmeModal.commissionValue} flat per order`}
                  </span>
                </div>

                {/* Customer Discount */}
                <div className={styles.formGroup}>
                  <label htmlFor="prog-disc-val">
                    Buyer Discount <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWithSelectWrap}>
                    <select
                      value={programmeModal.discountType}
                      onChange={(e) => setProgrammeModal({ ...programmeModal, discountType: e.target.value })}
                      className={styles.prefixSelect}
                    >
                      <option value="percentage">% Percentage</option>
                      <option value="fixed">₹ Fixed Off</option>
                    </select>
                    <input
                      id="prog-disc-val"
                      type="number"
                      min={0}
                      step={programmeModal.discountType === "fixed" ? 1 : 0.5}
                      value={programmeModal.discountValue}
                      onChange={(e) => setProgrammeModal({ ...programmeModal, discountValue: Number(e.target.value) })}
                      className={styles.modalInputCombined}
                    />
                  </div>
                  <span className={styles.fieldHelp}>
                    {programmeModal.discountType === "percentage"
                      ? `Buyer receives ${programmeModal.discountValue}% discount at checkout`
                      : `Buyer receives ₹${programmeModal.discountValue} off at checkout`}
                  </span>
                </div>
              </div>

              {/* 3. Product Scope: All / Category / Particular Products */}
              <div className={styles.formGroup}>
                <label>Applicable Product Scope:</label>
                <div className={styles.scopeRadioGroup}>
                  <label className={`${styles.scopeRadioCard} ${programmeModal.scopeType === "all" ? styles.scopeRadioActive : ""}`}>
                    <input
                      type="radio"
                      name="scopeType"
                      value="all"
                      checked={programmeModal.scopeType === "all"}
                      onChange={() => setProgrammeModal({ ...programmeModal, scopeType: "all" })}
                    />
                    <div>
                      <strong>All Products</strong>
                      <span>Applies to all store plants & fertilizers</span>
                    </div>
                  </label>

                  <label className={`${styles.scopeRadioCard} ${programmeModal.scopeType === "category" ? styles.scopeRadioActive : ""}`}>
                    <input
                      type="radio"
                      name="scopeType"
                      value="category"
                      checked={programmeModal.scopeType === "category"}
                      onChange={() => setProgrammeModal({ ...programmeModal, scopeType: "category" })}
                    />
                    <div>
                      <strong>Specific Category</strong>
                      <span>Assign to a specific plant category</span>
                    </div>
                  </label>

                  <label className={`${styles.scopeRadioCard} ${programmeModal.scopeType === "products" ? styles.scopeRadioActive : ""}`}>
                    <input
                      type="radio"
                      name="scopeType"
                      value="products"
                      checked={programmeModal.scopeType === "products"}
                      onChange={() => setProgrammeModal({ ...programmeModal, scopeType: "products" })}
                    />
                    <div>
                      <strong>Particular Products</strong>
                      <span>Select individual items</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* If scope === 'category': show category dropdown */}
              {programmeModal.scopeType === "category" && (
                <div className={styles.formGroupSub}>
                  <label htmlFor="prog-category">Select Target Category:</label>
                  <select
                    id="prog-category"
                    value={programmeModal.categoryId || ""}
                    onChange={(e) => setProgrammeModal({ ...programmeModal, categoryId: e.target.value })}
                    className={styles.modalSelect}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* If scope === 'products': show product checklist */}
              {programmeModal.scopeType === "products" && (
                <div className={styles.formGroupSub}>
                  <div className={styles.productListHeader}>
                    <label>Select Particular Products ({programmeModal.productIds?.length || 0} selected):</label>
                    <div className={styles.productSearchBox}>
                      <FiSearch />
                      <input
                        type="text"
                        placeholder="Filter products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className={styles.miniSearchInput}
                      />
                    </div>
                  </div>

                  <div className={styles.productSelectionScroll}>
                    {filteredProductsForScope.map((prod) => {
                      const checked = (programmeModal.productIds || []).includes(prod.id);
                      return (
                        <label key={prod.id} className={styles.productCheckRow}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const current = programmeModal.productIds || [];
                              if (e.target.checked) {
                                setProgrammeModal({ ...programmeModal, productIds: [...current, prod.id] });
                              } else {
                                setProgrammeModal({ ...programmeModal, productIds: current.filter((id) => id !== prod.id) });
                              }
                            }}
                          />
                          <span className={styles.prodRowTitle}>{prod.title}</span>
                          <span className={styles.prodRowPrice}>₹{prod.price}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Minimum Eligibility & Code Duration */}
              <div className={styles.twoColModal}>
                <div className={styles.formGroup}>
                  <label htmlFor="prog-min-order">
                    Minimum Cart Eligibility (₹):
                  </label>
                  <input
                    id="prog-min-order"
                    type="number"
                    min={0}
                    step={10}
                    value={programmeModal.minOrderValue}
                    onChange={(e) => setProgrammeModal({ ...programmeModal, minOrderValue: Number(e.target.value) })}
                    className={styles.modalInput}
                    placeholder="0 (No minimum limit)"
                  />
                  <span className={styles.fieldHelp}>
                    {programmeModal.minOrderValue > 0
                      ? `Cart must be at least ₹${programmeModal.minOrderValue} to avail code`
                      : "No minimum cart order value required"}
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label>Code Duration / Validity:</label>
                  <div className={styles.dateInputsRow}>
                    <input
                      type="date"
                      title="Start Date"
                      value={programmeModal.startDate || ""}
                      onChange={(e) => setProgrammeModal({ ...programmeModal, startDate: e.target.value })}
                      className={styles.dateInput}
                    />
                    <span className={styles.dateSep}>to</span>
                    <input
                      type="date"
                      title="End Date (optional)"
                      value={programmeModal.endDate || ""}
                      onChange={(e) => setProgrammeModal({ ...programmeModal, endDate: e.target.value })}
                      className={styles.dateInput}
                    />
                  </div>
                  <span className={styles.fieldHelp}>Leave end date empty for an ongoing programme</span>
                </div>
              </div>

              {/* 5. Approved Partners Allowed to Promote This Code */}
              <div className={styles.formGroup}>
                <div className={styles.partnerSelectionHeader}>
                  <label>
                    Assign Approved Partners ({programmeModal.partnerIds?.length || 0} selected):
                  </label>
                  <div className={styles.partnerActionBtns}>
                    <button
                      type="button"
                      onClick={() =>
                        setProgrammeModal({
                          ...programmeModal,
                          partnerIds: approvedPartners.map((p) => p.id)
                        })
                      }
                      className={styles.btnMiniLink}
                    >
                      Select All
                    </button>
                    <span className={styles.dotSep}>·</span>
                    <button
                      type="button"
                      onClick={() => setProgrammeModal({ ...programmeModal, partnerIds: [] })}
                      className={styles.btnMiniLink}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className={styles.partnerSearchWrap}>
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search approved partners by name, mobile, or coupon..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    className={styles.miniSearchInput}
                  />
                </div>

                <div className={styles.partnerSelectionScroll}>
                  {approvedPartners.length === 0 ? (
                    <p className={styles.noApprovedPartnersNotice}>
                      No approved partner accounts found yet. Approve partner requests in the Requests tab first.
                    </p>
                  ) : (
                    filteredPartnersForScope.map((partner) => {
                      const checked = (programmeModal.partnerIds || []).includes(partner.id);
                      return (
                        <label key={partner.id} className={styles.partnerCheckRow}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const current = programmeModal.partnerIds || [];
                              if (e.target.checked) {
                                setProgrammeModal({ ...programmeModal, partnerIds: [...current, partner.id] });
                              } else {
                                setProgrammeModal({ ...programmeModal, partnerIds: current.filter((id) => id !== partner.id) });
                              }
                            }}
                          />
                          <div className={styles.partnerRowInfo}>
                            <strong>{partner.name}</strong>
                            <span>+91 {partner.phone}</span>
                          </div>
                          {partner.couponCode && (
                            <span className={styles.partnerRowCoupon}>{partner.couponCode}</span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Terms and Status */}
              <div className={styles.twoColModal}>
                <div className={styles.formGroup}>
                  <label htmlFor="prog-terms">Terms & Payout Notes:</label>
                  <input
                    id="prog-terms"
                    type="text"
                    value={programmeModal.terms}
                    onChange={(e) => setProgrammeModal({ ...programmeModal, terms: e.target.value })}
                    placeholder="e.g. Monthly payout on completed orders"
                    className={styles.modalInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="prog-status">Status:</label>
                  <select
                    id="prog-status"
                    value={programmeModal.status}
                    onChange={(e) => setProgrammeModal({ ...programmeModal, status: e.target.value })}
                    className={styles.modalSelect}
                  >
                    <option value="active">Active (Available for creators)</option>
                    <option value="inactive">Paused / Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setProgrammeModal(null)}
                className={styles.modalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAction || !programmeModal.title.trim()}
                onClick={saveProgramme}
                className={styles.modalConfirmBtn}
              >
                {savingAction ? "Saving Programme..." : "Save Affiliate Programme"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
