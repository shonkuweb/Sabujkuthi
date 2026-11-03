"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiTruck } from "react-icons/fi";
import styles from "./CategoriesPanel.module.css";

export default function DeliverySettingsEditor({ onSavingChange }) {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError("");
    try {
      const response = await fetch("/api/store-settings/delivery", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load delivery settings.");
      setSettings(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSavingChange(saving);
  }, [saving, onSavingChange]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/store-settings/delivery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save delivery settings.");

      setSettings(data);
      setNotice("Delivery rules and charges saved successfully.");

      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("store-settings");
        channel.postMessage("delivery-updated");
        channel.close();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className={styles.empty}>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className={styles.secondary} onClick={load}>
              Try again
            </button>
          </>
        ) : (
          <p role="status">Loading delivery settings…</p>
        )}
      </div>
    );
  }

  const charge = Number(settings.deliveryCharge) || 0;
  const threshold = Number(settings.freeDeliveryThreshold) || 0;

  return (
    <div className={styles.workspace}>
      <p className={styles.hint}>
        Set your nursery delivery fee and free shipping conditions. These rules automatically apply to all cart totals, checkout orders, and customer announcements.
      </p>

      <form className={styles.editor} onSubmit={save} aria-label="Delivery settings">
        <fieldset className={styles.fields} disabled={saving}>
          <div className={styles.formColumns}>
            <div>
              <label className={styles.label} htmlFor="delivery-charge">
                Standard delivery charge (₹)
              </label>
              <input
                id="delivery-charge"
                type="number"
                min="0"
                max="100000"
                step="1"
                required
                className={styles.nameInput}
                value={settings.deliveryCharge ?? 40}
                onChange={(e) =>
                  setSettings({ ...settings, deliveryCharge: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
              <p className={styles.hint} style={{ marginTop: -16, marginBottom: 16 }}>
                Fee added when order total is below the free delivery minimum.
              </p>
            </div>

            <div>
              <label className={styles.label} htmlFor="free-delivery-threshold">
                Free delivery minimum order (₹)
              </label>
              <input
                id="free-delivery-threshold"
                type="number"
                min="0"
                max="10000000"
                step="1"
                required
                className={styles.nameInput}
                value={settings.freeDeliveryThreshold ?? 3999}
                onChange={(e) =>
                  setSettings({ ...settings, freeDeliveryThreshold: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
              <p className={styles.hint} style={{ marginTop: -16, marginBottom: 16 }}>
                Minimum items total for free shipping. Set to 0 for free delivery on all orders.
              </p>
            </div>
          </div>

          <div className={styles.visibility} style={{ marginTop: 8 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiTruck aria-hidden="true" style={{ color: "#26784a" }} /> Active Rule Summary
              </label>
              <p style={{ marginTop: 4 }}>
                {threshold === 0
                  ? "All customer orders qualify for 100% FREE delivery regardless of amount."
                  : `Orders under ₹${threshold.toLocaleString("en-IN")} pay ₹${charge.toLocaleString("en-IN")} delivery. Orders ₹${threshold.toLocaleString("en-IN")} and above qualify for FREE delivery.`}
              </p>
            </div>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className={styles.success} role="status">
              <FiCheck aria-hidden="true" />
              {notice}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={saving}>
              {saving ? "Saving…" : "Save delivery settings"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
