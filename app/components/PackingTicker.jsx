"use client";

import { useStoreSettings } from "../context/StoreSettingsContext";
import styles from "./PackingTicker.module.css";

const defaultMessage = "🌿 Since plants are delicate and require careful selection and packing from the field, please allow 4–5 days for us to prepare your order.";

export default function PackingTicker() {
  const { heroSettings } = useStoreSettings();
  const message = heroSettings?.endTickerText?.trim() || defaultMessage;

  return (
    <aside className={styles.ticker} aria-label="Order preparation notice">
      <p className={styles.accessibleText}>{message}</p>
      <div className={styles.track} aria-hidden="true">
        <span>{message}</span>
        <span>{message}</span>
      </div>
    </aside>
  );
}
