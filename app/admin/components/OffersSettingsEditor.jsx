"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiGift, FiInfo, FiPercent, FiSave, FiTag } from "react-icons/fi";
import { DEFAULT_OFFERS_SETTINGS } from "../../../lib/discounts.mjs";
import styles from "./OffersSettingsEditor.module.css";

export default function OffersSettingsEditor({ onSavingChange }) {
  const [settings, setSettings] = useState(DEFAULT_OFFERS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/store-settings/offers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load offers settings.");
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = (path, value) => {
    setSettings((prev) => {
      const next = { ...prev };
      if (path.includes(".")) {
        const [parent, child] = path.split(".");
        next[parent] = { ...next[parent], [child]: value };
      } else {
        next[path] = value;
      }
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    onSavingChange?.(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/store-settings/offers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save offers settings.");
      setSettings(data);
      setNotice("Offers & discounts updated successfully.");

      // Broadcast update across tabs
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("store-settings");
        channel.postMessage("offers_updated");
        channel.close();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  const rule = settings.discountRule || DEFAULT_OFFERS_SETTINGS.discountRule;

  if (loading) {
    return <div className={styles.loading}>Loading offers configuration…</div>;
  }

  return (
    <form className={styles.form} onSubmit={handleSave}>
      {notice && (
        <div className={styles.notice} role="status">
          <FiCheck aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Announcement Bar */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}><FiTag /></span>
          <div>
            <h3>Announcement Bar Header</h3>
            <p>Customize the banner message shown at the top of every page.</p>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldInfo}>
            <label htmlFor="announcement-toggle">Show Announcement Bar</label>
            <p>Toggle the top announcement bar visible on the storefront.</p>
          </div>
          <button
            id="announcement-toggle"
            type="button"
            role="switch"
            aria-checked={settings.announcementVisible}
            className={styles.switch}
            onClick={() => updateField("announcementVisible", !settings.announcementVisible)}
          >
            <span />
          </button>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="announcement-text">Announcement Message</label>
          <input
            id="announcement-text"
            type="text"
            maxLength={250}
            className={styles.input}
            value={settings.announcementText || ""}
            placeholder="e.g. Festival Offer: Flat 10% OFF on all orders above ₹999! 🌿"
            onChange={(e) => updateField("announcementText", e.target.value)}
          />
          <span className={styles.helper}>Displayed prominently at the very top of the store.</span>
        </div>
      </div>

      {/* Section 2: Automated Discount Rule */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}><FiPercent /></span>
          <div>
            <h3>Automatic Discount Rule</h3>
            <p>Configure automatic discounts applied to the customer's cart and checkout.</p>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldInfo}>
            <label htmlFor="discount-toggle">Enable Automatic Discount</label>
            <p>When enabled, qualifying orders automatically receive this discount.</p>
          </div>
          <button
            id="discount-toggle"
            type="button"
            role="switch"
            aria-checked={rule.enabled}
            className={styles.switch}
            onClick={() => updateField("discountRule.enabled", !rule.enabled)}
          >
            <span />
          </button>
        </div>

        <div className={styles.grid2}>
          <div className={styles.inputGroup}>
            <label htmlFor="discount-title">Offer Title</label>
            <input
              id="discount-title"
              type="text"
              className={styles.input}
              maxLength={80}
              value={rule.title || ""}
              placeholder="e.g. Festive Discount"
              onChange={(e) => updateField("discountRule.title", e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="discount-type">Discount Type</label>
            <select
              id="discount-type"
              className={styles.select}
              value={rule.type || "percentage"}
              onChange={(e) => updateField("discountRule.type", e.target.value)}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Flat Amount (₹)</option>
            </select>
          </div>
        </div>

        <div className={styles.grid3}>
          <div className={styles.inputGroup}>
            <label htmlFor="discount-value">
              {rule.type === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
            </label>
            <input
              id="discount-value"
              type="number"
              min="1"
              max={rule.type === "percentage" ? 90 : 10000}
              className={styles.input}
              value={rule.value || ""}
              onChange={(e) => updateField("discountRule.value", Number(e.target.value))}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="discount-min-order">Min Order Subtotal (₹)</label>
            <input
              id="discount-min-order"
              type="number"
              min="10"
              max="100000"
              className={styles.input}
              value={rule.minOrderAmount || ""}
              onChange={(e) => updateField("discountRule.minOrderAmount", Number(e.target.value))}
            />
          </div>

          {rule.type === "percentage" && (
            <div className={styles.inputGroup}>
              <label htmlFor="discount-max-cap">Max Cap (₹, optional)</label>
              <input
                id="discount-max-cap"
                type="number"
                min="10"
                className={styles.input}
                value={rule.maxDiscount || ""}
                placeholder="No limit"
                onChange={(e) => updateField("discountRule.maxDiscount", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Near-Threshold 51% Nudge Banner */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}><FiGift /></span>
          <div>
            <h3>Conversion Nudge Banner</h3>
            <p>Show a motivating progress banner when the customer reaches 51% of the discount threshold.</p>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldInfo}>
            <label htmlFor="nudge-toggle">Enable 51% Near-Threshold Nudge Banner</label>
            <p>Displays an encouraging progress banner in the cart and checkout urging customers to add more items.</p>
          </div>
          <button
            id="nudge-toggle"
            type="button"
            role="switch"
            aria-checked={rule.nudgeBannerEnabled}
            className={styles.switch}
            onClick={() => updateField("discountRule.nudgeBannerEnabled", !rule.nudgeBannerEnabled)}
          >
            <span />
          </button>
        </div>

        {/* Live Preview of Nudge Banner */}
        <div className={styles.previewBox}>
          <span className={styles.previewEyebrow}>CUSTOMER BANNER PREVIEW (WHEN 51%+ OF THRESHOLD)</span>
          <div className={styles.nudgeBanner}>
            <div className={styles.nudgeTop}>
              <span className={styles.nudgeTag}>🎉 Almost There!</span>
              <span className={styles.nudgeDiscountBadge}>
                {rule.type === "percentage" ? `${rule.value}% OFF` : `₹${rule.value} OFF`}
              </span>
            </div>
            <p className={styles.nudgeText}>
              Add just <strong>₹{Math.max(10, Math.round(rule.minOrderAmount * 0.35))}</strong> more to unlock{" "}
              <strong>{rule.type === "percentage" ? `${rule.value}% OFF` : `₹${rule.value} OFF`}</strong> on your order!
            </p>
            <div className={styles.progressBarWrap}>
              <div className={styles.progressBarFill} style={{ width: "65%" }} />
            </div>
            <div className={styles.nudgeFooter}>
              <span>65% completed</span>
              <span className={styles.previewCtaBtn}>{rule.bannerCtaText || "Add More Plants"} →</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.saveBtn} disabled={saving}>
          <FiSave />
          <span>{saving ? "Saving…" : "Save Changes"}</span>
        </button>
      </div>
    </form>
  );
}
