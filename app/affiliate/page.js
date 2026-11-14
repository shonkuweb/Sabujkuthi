"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiAward,
  FiCheck,
  FiCheckCircle,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiInfo,
  FiLink,
  FiLock,
  FiLogOut,
  FiMail,
  FiMessageSquare,
  FiPackage,
  FiPhone,
  FiShield,
  FiShoppingBag,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiXCircle
} from "react-icons/fi";
import { FaFacebook, FaInstagram, FaYoutube, FaWhatsapp, FaLeaf } from "react-icons/fa";
import { business } from "../../lib/business.mjs";
import styles from "./page.module.css";

export default function AffiliatePage() {
  const [mode, setMode] = useState("apply"); // 'apply' | 'login'
  const [authLoading, setAuthLoading] = useState(true);
  const [account, setAccount] = useState(null);

  // Application form state
  const [applyForm, setApplyForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    youtubeUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    message: ""
  });
  const [showApplyPass, setShowApplyPass] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);

  // Login form state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load active session on mount
  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        const res = await fetch("/api/affiliate/me");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.success && data.account) {
            setAccount(data.account);
          }
        }
      } catch (err) {
        console.error("Failed to fetch affiliate profile:", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }
    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplyError("");

    // Client check for at least 1 link
    const yt = applyForm.youtubeUrl.trim();
    const insta = applyForm.instagramUrl.trim();
    const fb = applyForm.facebookUrl.trim();

    if (!yt && !insta && !fb) {
      setApplyError("Please provide at least one profile link (YouTube, Instagram, or Facebook).");
      return;
    }

    if (applyForm.password.length < 6) {
      setApplyError("Password must be at least 6 characters long.");
      return;
    }

    setApplyBusy(true);
    try {
      const res = await fetch("/api/affiliate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applyForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setApplyError(data.message || "Unable to submit application. Please verify details.");
        return;
      }

      setApplySuccess(true);
      // Fetch fresh affiliate account details
      const meRes = await fetch("/api/affiliate/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success && meData.account) {
          setAccount(meData.account);
        }
      }
    } catch {
      setApplyError("Network error occurred while submitting. Please try again.");
    } finally {
      setApplyBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!loginPhone.trim() || !loginPassword) {
      setLoginError("Please enter both your mobile number and password.");
      return;
    }

    setLoginBusy(true);
    try {
      const res = await fetch("/api/affiliate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.message || "Invalid mobile number or password.");
        return;
      }

      // Fetch full profile & dashboard details
      const meRes = await fetch("/api/affiliate/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success && meData.account) {
          setAccount(meData.account);
        }
      }
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/affiliate/logout", { method: "POST" });
    } catch {}
    setAccount(null);
    setApplySuccess(false);
    setMode("login");
  };

  const copyToClipboard = (text, type) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p>Loading affiliate portal...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOGGED-IN CREATOR DASHBOARD / STATUS VIEW
  // -------------------------------------------------------------
  if (account) {
    const isApproved = account.status === "approved";
    const isPending = account.status === "pending";
    const isRejected = account.status === "rejected";
    const isBanned = account.status === "banned";

    const affiliateLink = typeof window !== "undefined" && account.couponCode
      ? `${window.location.origin}/collection?ref=${account.couponCode}`
      : `https://sabujkuthi.in/collection?ref=${account.couponCode || ""}`;

    return (
      <div className={styles.dashboardContainer}>
        {/* Header Bar */}
        <div className={styles.dashHeader}>
          <div className={styles.dashHeaderLeft}>
            <div className={styles.creatorAvatar}>
              {(account.name ? account.name[0] : "A").toUpperCase()}
            </div>
            <div>
              <div className={styles.dashTitleRow}>
                <h1 className={styles.creatorName}>{account.name}</h1>
                {isApproved && <span className={styles.verifiedBadge}><FiCheck /> Verified Partner</span>}
                {isPending && <span className={styles.pendingBadge}><FiInfo /> Under Review</span>}
                {isRejected && <span className={styles.rejectedBadge}><FiXCircle /> Application Declined</span>}
                {isBanned && <span className={styles.bannedBadge}><FiAlertCircle /> Suspended</span>}
              </div>
              <p className={styles.creatorContact}>
                <span><FiPhone /> +91 {account.phone}</span>
                <span><FiMail /> {account.email}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className={styles.signOutBtn} title="Sign Out of Creator Account">
            <FiLogOut />
            <span>Sign Out</span>
          </button>
        </div>

        {/* 1. WARNING NOTIFICATION (if admin gave warning message) */}
        {account.warningMessage && (
          <div className={styles.warningBanner}>
            <div className={styles.warningIcon}>
              <FiAlertTriangle />
            </div>
            <div className={styles.warningContent}>
              <h3 className={styles.warningTitle}>Important Notice from SabujKuthi Administration</h3>
              <p className={styles.warningText}>{account.warningMessage}</p>
            </div>
          </div>
        )}

        {/* 2. BANNED BANNER (if admin banned with a custom message) */}
        {isBanned && (
          <div className={styles.bannedBanner}>
            <div className={styles.bannedIcon}>
              <FiXCircle />
            </div>
            <div className={styles.bannedContent}>
              <h3 className={styles.bannedTitle}>Affiliate Account Suspended</h3>
              <p className={styles.bannedReason}>
                {account.banMessage || "Your affiliate account has been suspended by administration. Please contact nursery support if you have questions."}
              </p>
              <div className={styles.bannedSupportRow}>
                <span>Need assistance? Contact our team on WhatsApp: </span>
                <a href={business.whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.supportLink}>
                  <FaWhatsapp /> +91 86370 54105
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 3. PENDING REVIEW STATUS */}
        {isPending && (
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusIconWrapPending}>
                <FiInfo />
              </div>
              <div>
                <h2>Your Application is Under Review</h2>
                <p>
                  Thank you for applying to the Sabuj Kuthi Affiliate Programme! Our nursery team is currently evaluating your social channels and application note.
                </p>
              </div>
            </div>

            <div className={styles.submittedDetails}>
              <h3>Submitted Profile Information</h3>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Full Name</span>
                  <span className={styles.detailValue}>{account.name}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mobile Number</span>
                  <span className={styles.detailValue}>+91 {account.phone}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email Address</span>
                  <span className={styles.detailValue}>{account.email}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Applied Date</span>
                  <span className={styles.detailValue}>
                    {new Date(account.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              <div className={styles.socialLinksRow}>
                <span className={styles.detailLabel}>Submitted Profile Links:</span>
                <div className={styles.socialLinksGroup}>
                  {account.youtubeUrl && (
                    <a href={account.youtubeUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBadgeYt}>
                      <FaYoutube /> YouTube
                    </a>
                  )}
                  {account.instagramUrl && (
                    <a href={account.instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBadgeInsta}>
                      <FaInstagram /> Instagram
                    </a>
                  )}
                  {account.facebookUrl && (
                    <a href={account.facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.socialBadgeFb}>
                      <FaFacebook /> Facebook
                    </a>
                  )}
                </div>
              </div>

              {account.message && (
                <div className={styles.messageBox}>
                  <span className={styles.detailLabel}>Your Message to Team:</span>
                  <p className={styles.messageText}>&ldquo;{account.message}&rdquo;</p>
                </div>
              )}
            </div>

            <div className={styles.pendingFooterNote}>
              <FaLeaf />
              <span>We usually review creator applications within 24 to 48 hours. Once approved, your coupon code and active campaigns will appear automatically right here!</span>
            </div>
          </div>
        )}

        {/* 4. REJECTED STATUS */}
        {isRejected && (
          <div className={styles.statusCard}>
            <div className={styles.statusCardHeader}>
              <div className={styles.statusIconWrapRejected}>
                <FiXCircle />
              </div>
              <div>
                <h2>Application Not Approved</h2>
                <p>
                  Thank you for your interest in partnering with SabujKuthi Nursery. Unfortunately, we are unable to accept your application at this time.
                </p>
                {account.rejectReason && (
                  <div className={styles.rejectReasonBox}>
                    <strong>Feedback from review team:</strong>
                    <p>{account.rejectReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. APPROVED ACTIVE DASHBOARD */}
        {isApproved && (
          <>
            {/* Coupon Code & Referral Box */}
            <div className={styles.couponShowcase}>
              <div className={styles.couponLeft}>
                <div className={styles.couponTag}>Your Official Coupon Code</div>
                <div className={styles.codeRow}>
                  <span className={styles.couponText}>{account.couponCode || "PENDING"}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(account.couponCode, "code")}
                    className={styles.copyBtn}
                    title="Copy Coupon Code"
                  >
                    {copiedCode ? <FiCheck /> : <FiCopy />}
                    <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>
                <p className={styles.couponDesc}>
                  Share this coupon code with your audience. When they enter it during checkout, they receive a special discount and their order is credited directly to your partner dashboard.
                </p>
              </div>

              <div className={styles.couponRight}>
                <span className={styles.shareLabel}>1-Click Referral Link</span>
                <div className={styles.referralLinkBox}>
                  <input type="text" readOnly value={affiliateLink} className={styles.referralInput} />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(affiliateLink, "link")}
                    className={styles.linkCopyBtn}
                    title="Copy Referral Link"
                  >
                    {copiedLink ? <FiCheck /> : <FiLink />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <span className={styles.linkSub}>Pre-loads your affiliate attribution when opened</span>
              </div>
            </div>

            {/* Performance KPIs */}
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiIconBox} style={{ background: "#ecfdf5", color: "#059669" }}>
                  <FiUsers />
                </div>
                <div className={styles.kpiDetails}>
                  <span className={styles.kpiLabel}>Users Used Coupon</span>
                  <span className={styles.kpiValue}>{account.stats?.usersCount || 0}</span>
                  <span className={styles.kpiSub}>Unique buyers</span>
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiIconBox} style={{ background: "#eff6ff", color: "#2563eb" }}>
                  <FiShoppingBag />
                </div>
                <div className={styles.kpiDetails}>
                  <span className={styles.kpiLabel}>Products Sold</span>
                  <span className={styles.kpiValue}>{account.stats?.productsSold || 0}</span>
                  <span className={styles.kpiSub}>Plants & fertilizers</span>
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiIconBox} style={{ background: "#fef3c7", color: "#d97706" }}>
                  <FiTrendingUp />
                </div>
                <div className={styles.kpiDetails}>
                  <span className={styles.kpiLabel}>Attributed Sales</span>
                  <span className={styles.kpiValue}>
                    ₹{((account.stats?.totalSalesPaise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span className={styles.kpiSub}>Delivered order value</span>
                </div>
              </div>
            </div>

            {/* Active Programmes Running Under This Account */}
            <div className={styles.programmesSection}>
              <div className={styles.secHeader}>
                <h2>
                  <FiAward />
                  <span>Active Programmes Running Under Your Account ({account.programmes?.length || 0})</span>
                </h2>
                <span className={styles.secSub}>Campaign tiers and commission structures enrolled</span>
              </div>

              {account.programmes && account.programmes.length > 0 ? (
                <div className={styles.programmeList}>
                  {account.programmes.map((prog) => {
                    const isFixedComm = prog.commissionType === "fixed";
                    const isFixedDisc = prog.discountType === "fixed";

                    return (
                      <div key={prog.id} className={styles.programmeCard}>
                        <div className={styles.progMain}>
                          <div className={styles.progTitleRow}>
                            <h3 className={styles.progTitle}>{prog.title}</h3>
                            <span className={styles.progStatusActive}>Active</span>
                          </div>
                          {prog.description && <p className={styles.progDesc}>{prog.description}</p>}

                          {/* Scope & Eligibility Badges */}
                          <div className={styles.progScopeBadgeGroup}>
                            <span className={styles.scopeMiniTag}>
                              {prog.scopeType === "category"
                                ? "Category Special"
                                : prog.scopeType === "products"
                                ? "Selected Plants"
                                : "All Nursery Plants"}
                            </span>
                            {prog.minOrderValue > 0 && (
                              <span className={styles.eligibilityMiniTag}>
                                Min Order: ₹{prog.minOrderValue}
                              </span>
                            )}
                            {prog.endDate && (
                              <span className={styles.durationMiniTag}>
                                Valid until: {prog.endDate}
                              </span>
                            )}
                          </div>

                          {prog.terms && (
                            <div className={styles.progTerms}>
                              <FiInfo /> <span>{prog.terms}</span>
                            </div>
                          )}
                        </div>

                        <div className={styles.progMetrics}>
                          <div className={styles.progBadge}>
                            <span className={styles.progBadgeNum}>
                              {isFixedComm ? `₹${prog.commissionValue}` : `${prog.commissionValue}%`}
                            </span>
                            <span className={styles.progBadgeText}>
                              {isFixedComm ? "Fixed Commission" : "Commission"}
                            </span>
                          </div>
                          <div className={styles.progBadgeSecondary}>
                            <span className={styles.progBadgeNum}>
                              {isFixedDisc ? `₹${prog.discountValue}` : `${prog.discountValue}%`}
                            </span>
                            <span className={styles.progBadgeText}>Buyer Discount</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyProgrammes}>
                  <p>You are currently enrolled in our standard creator tier. Our admin team will assign special campaigns to your account soon.</p>
                </div>
              )}
            </div>

            {/* Creator Toolkit & Tips */}
            <div className={styles.toolkitCard}>
              <h3>Creator Best Practices</h3>
              <div className={styles.tipsGrid}>
                <div className={styles.tipItem}>
                  <FaLeaf className={styles.tipIcon} />
                  <div>
                    <h4>Highlight Authenticity</h4>
                    <p>Showcase real unboxing, root development, and graft health of SabujKuthi adeniums and plants in your videos.</p>
                  </div>
                </div>
                <div className={styles.tipItem}>
                  <FiCopy className={styles.tipIcon} />
                  <div>
                    <h4>Place Code in Descriptions</h4>
                    <p>Add your coupon code ({account.couponCode}) and store link in YouTube descriptions, Instagram bio & stories.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // PUBLIC / GUEST VIEW: APPLY OR LOGIN
  // -------------------------------------------------------------
  return (
    <div className={styles.container}>
      {/* Hero Intro */}
      <div className={styles.hero}>
        <div className={styles.heroBadge}>
          <FiAward /> <span>SabujKuthi Creator & Affiliate Hub</span>
        </div>
        <h1 className={styles.heroTitle}>Partner with Bengal&apos;s Premier Plant Nursery</h1>
        <p className={styles.heroSubtitle}>
          Monetize your gardening passion. Share genuine plant care, exotic adeniums & organic fertilizers with your audience while earning attractive commissions.
        </p>
      </div>

      {/* Tab Switcher: Apply vs Login */}
      <div className={styles.authWrapper}>
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === "apply" ? styles.tabBtnActive : ""}`}
            onClick={() => {
              setMode("apply");
              setApplyError("");
            }}
          >
            Apply to Programme
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${mode === "login" ? styles.tabBtnActive : ""}`}
            onClick={() => {
              setMode("login");
              setLoginError("");
            }}
          >
            Partner Login & Status
          </button>
        </div>

        {/* MODE: APPLY */}
        {mode === "apply" ? (
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Creator Application Form</h2>
              <p>Fill out your basic details and social links. At least one social profile link is required.</p>
            </div>

            {applySuccess ? (
              <div className={styles.successCard}>
                <div className={styles.successIconBox}>
                  <FiCheckCircle />
                </div>
                <h3>Application Submitted Successfully!</h3>
                <p>
                  Thank you for applying to the Sabuj Kuthi Affiliate Programme! We have received your application and will review your profile.
                </p>
                <p className={styles.successNote}>
                  You can log in anytime using your mobile number and password to check your application status.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className={styles.primaryBtn}
                >
                  View Application Status <FiArrowRight />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApply} className={styles.form}>
                {applyError && (
                  <div className={styles.errorAlert}>
                    <FiAlertCircle />
                    <span>{applyError}</span>
                  </div>
                )}

                {/* Name */}
                <div className={styles.formGroup}>
                  <label htmlFor="affiliate-name">
                    Full Name <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <FiUser className={styles.fieldIcon} />
                    <input
                      id="affiliate-name"
                      type="text"
                      required
                      placeholder="e.g. Priya Mukherjee"
                      value={applyForm.name}
                      onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
                      className={styles.textInput}
                    />
                  </div>
                </div>

                {/* Email & Phone in 2-col */}
                <div className={styles.twoCol}>
                  <div className={styles.formGroup}>
                    <label htmlFor="affiliate-email">
                      Email Address <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrapper}>
                      <FiMail className={styles.fieldIcon} />
                      <input
                        id="affiliate-email"
                        type="email"
                        required
                        placeholder="you@gmail.com"
                        value={applyForm.email}
                        onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                        className={styles.textInput}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="affiliate-phone">
                      Mobile Number <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrapper}>
                      <FiPhone className={styles.fieldIcon} />
                      <span className={styles.countryCode}>+91</span>
                      <input
                        id="affiliate-phone"
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={applyForm.phone}
                        onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value.replace(/\D/g, "") })}
                        className={styles.textInputWithCode}
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className={styles.formGroup}>
                  <label htmlFor="affiliate-password">
                    Create Password <span className={styles.required}>*</span>
                    <span className={styles.labelHint}>(Use this with your mobile number to log in later)</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <FiLock className={styles.fieldIcon} />
                    <input
                      id="affiliate-password"
                      type={showApplyPass ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      value={applyForm.password}
                      onChange={(e) => setApplyForm({ ...applyForm, password: e.target.value })}
                      className={styles.textInput}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApplyPass(!showApplyPass)}
                      className={styles.eyeBtn}
                      title={showApplyPass ? "Hide password" : "Show password"}
                    >
                      {showApplyPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {/* Profile Links Section */}
                <div className={styles.socialSection}>
                  <div className={styles.socialHeader}>
                    <h3>Social Profiles & Channels</h3>
                    <p className={styles.socialNotice}>
                      * At least <strong>one link is mandatory</strong>. Choose any profile(s) you use to share content with your audience.
                    </p>
                  </div>

                  {/* 1. YouTube */}
                  <div className={styles.formGroup}>
                    <label htmlFor="affiliate-youtube" className={styles.socialLabel}>
                      <FaYoutube className={styles.ytIcon} />
                      <span>1. YouTube Channel Link</span>
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="affiliate-youtube"
                        type="text"
                        placeholder="https://youtube.com/@yourchannel"
                        value={applyForm.youtubeUrl}
                        onChange={(e) => setApplyForm({ ...applyForm, youtubeUrl: e.target.value })}
                        className={styles.textInput}
                      />
                    </div>
                  </div>

                  {/* 2. Instagram */}
                  <div className={styles.formGroup}>
                    <label htmlFor="affiliate-instagram" className={styles.socialLabel}>
                      <FaInstagram className={styles.instaIcon} />
                      <span>2. Instagram Profile Link</span>
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="affiliate-instagram"
                        type="text"
                        placeholder="https://instagram.com/yourhandle"
                        value={applyForm.instagramUrl}
                        onChange={(e) => setApplyForm({ ...applyForm, instagramUrl: e.target.value })}
                        className={styles.textInput}
                      />
                    </div>
                  </div>

                  {/* 3. Facebook */}
                  <div className={styles.formGroup}>
                    <label htmlFor="affiliate-facebook" className={styles.socialLabel}>
                      <FaFacebook className={styles.fbIcon} />
                      <span>3. Facebook Page / Profile Link</span>
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        id="affiliate-facebook"
                        type="text"
                        placeholder="https://facebook.com/yourpage"
                        value={applyForm.facebookUrl}
                        onChange={(e) => setApplyForm({ ...applyForm, facebookUrl: e.target.value })}
                        className={styles.textInput}
                      />
                    </div>
                  </div>
                </div>

                {/* Short Message Box */}
                <div className={styles.formGroup}>
                  <label htmlFor="affiliate-message">
                    Short Message / Creator Bio
                    <span className={styles.labelHint}>(Tell us about your audience, favorite plants, or gardening niche)</span>
                  </label>
                  <div className={styles.textareaWrapper}>
                    <textarea
                      id="affiliate-message"
                      rows={3}
                      placeholder="Hi! I share balcony gardening and adenium care videos with 25k plant enthusiasts in Bengal..."
                      value={applyForm.message}
                      onChange={(e) => setApplyForm({ ...applyForm, message: e.target.value })}
                      className={styles.textarea}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={applyBusy}
                  className={styles.submitBtn}
                >
                  {applyBusy ? (
                    <>
                      <div className={styles.btnSpinner} />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <FiArrowRight />
                    </>
                  )}
                </button>

                <p className={styles.switchPrompt}>
                  Already applied?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setApplyError("");
                    }}
                    className={styles.inlineLink}
                  >
                    Log in with mobile & password to view your status
                  </button>
                </p>
              </form>
            )}
          </div>
        ) : (
          /* MODE: LOGIN */
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2>Creator Partner Login</h2>
              <p>Log in with your registered mobile number and password to check your application status or access your affiliate dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className={styles.form}>
              {loginError && (
                <div className={styles.errorAlert}>
                  <FiAlertCircle />
                  <span>{loginError}</span>
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="login-phone">
                  Mobile Number <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <FiPhone className={styles.fieldIcon} />
                  <span className={styles.countryCode}>+91</span>
                  <input
                    id="login-phone"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))}
                    className={styles.textInputWithCode}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="login-password">
                  Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <FiLock className={styles.fieldIcon} />
                  <input
                    id="login-password"
                    type={showLoginPass ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={styles.textInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className={styles.eyeBtn}
                    title={showLoginPass ? "Hide password" : "Show password"}
                  >
                    {showLoginPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginBusy}
                className={styles.submitBtn}
              >
                {loginBusy ? (
                  <>
                    <div className={styles.btnSpinner} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Creator Dashboard</span>
                    <FiArrowRight />
                  </>
                )}
              </button>

              <p className={styles.switchPrompt}>
                Haven&apos;t joined yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("apply");
                    setLoginError("");
                  }}
                  className={styles.inlineLink}
                >
                  Apply to become a SabujKuthi affiliate partner
                </button>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
