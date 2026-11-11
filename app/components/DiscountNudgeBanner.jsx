"use client";

import Link from "next/link";
import { FiCheckCircle, FiGift } from "react-icons/fi";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { getDiscountNudgeStatus } from "../../lib/discounts.mjs";
import styles from "./DiscountNudgeBanner.module.css";

export default function DiscountNudgeBanner({ subtotal, onCtaClick }) {
  const { offersSettings } = useStoreSettings();
  const rule = offersSettings?.discountRule;

  if (!rule || !rule.enabled || !rule.nudgeBannerEnabled) {
    return null;
  }

  // Handle both Rupees and paise
  const subtotalRupees = typeof subtotal === "number" && subtotal > 100000
    ? Math.floor(subtotal / 100)
    : Number(subtotal) || 0;

  const status = getDiscountNudgeStatus(subtotalRupees, rule);

  if (status.isSatisfied) {
    return (
      <div className={styles.unlockedBanner} role="status">
        <FiCheckCircle className={styles.unlockedIcon} aria-hidden="true" />
        <div className={styles.unlockedText}>
          <strong>{status.ruleTitle} Unlocked!</strong>
          <span> You are saving {status.discountLabel} on this order.</span>
        </div>
      </div>
    );
  }

  if (!status.isNudgeEligible) {
    return null;
  }

  return (
    <div className={styles.nudgeCard} role="region" aria-label="Discount progress offer">
      <div className={styles.nudgeTop}>
        <div className={styles.nudgeTitle}>
          <FiGift className={styles.giftIcon} aria-hidden="true" />
          <span>Special Offer Near!</span>
        </div>
        <span className={styles.discountBadge}>{status.discountLabel}</span>
      </div>

      <p className={styles.nudgeMessage}>
        Add just <strong>₹{status.remainingAmount.toLocaleString("en-IN")}</strong> more plants to get{" "}
        <strong className={styles.highlight}>{status.discountLabel}</strong> on your order!
      </p>

      {/* Visual progress bar */}
      <div className={styles.progressBarWrap} aria-hidden="true">
        <div className={styles.progressBarFill} style={{ width: `${status.percentage}%` }} />
      </div>

      <div className={styles.nudgeBottom}>
        <span className={styles.progressText}>{status.percentage}% of goal reached</span>
        <Link
          href={status.bannerCtaLink || "/collection"}
          className={styles.ctaButton}
          onClick={onCtaClick}
        >
          <span>{status.bannerCtaText || "Add More Plants"}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
