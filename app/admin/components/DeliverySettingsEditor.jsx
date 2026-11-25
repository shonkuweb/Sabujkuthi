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

  const dtdcCharge = Number(settings.dtdcCharge ?? settings.deliveryCharge ?? 40);
  const bluedartCharge = Number(settings.bluedartCharge ?? 90);
  const threshold = Number(settings.freeDeliveryThreshold ?? 3999);

  return (
    <div className={styles.workspace}>
      <p className={styles.hint}>
        Configure courier rates for DTDC and Blue Dart, along with free delivery thresholds. At checkout, customers can choose between DTDC (economical, reliable) and Blue Dart (fast, priority care).
      </p>

      <form className={styles.editor} onSubmit={save} aria-label="Delivery settings">
        <fieldset className={styles.fields} disabled={saving}>
          <div className={styles.formColumns}>
            <div>
              <label className={styles.label} htmlFor="dtdc-charge">
                DTDC Standard delivery charge (₹)
              </label>
              <input
                id="dtdc-charge"
                type="number"
                min="0"
                max="100000"
                step="1"
                required
                className={styles.nameInput}
                value={settings.dtdcCharge ?? settings.deliveryCharge ?? 40}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : Number(e.target.value);
                  setSettings({ ...settings, dtdcCharge: val, deliveryCharge: val });
                }}
              />
              <p className={styles.hint} style={{ marginTop: -16, marginBottom: 16 }}>
                Standard shipping. Takes 5–8 days, plant condition is good.
              </p>
            </div>

            <div>
              <label className={styles.label} htmlFor="bluedart-charge">
                Blue Dart Express delivery charge (₹)
              </label>
              <input
                id="bluedart-charge"
                type="number"
                min="0"
                max="100000"
                step="1"
                required
                className={styles.nameInput}
                value={settings.bluedartCharge ?? 90}
                onChange={(e) =>
                  setSettings({ ...settings, bluedartCharge: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
              <p className={styles.hint} style={{ marginTop: -16, marginBottom: 16 }}>
                Express air shipping. Takes 2–4 days, fast delivery and superior quality.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
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
              Orders at or above this amount receive FREE DTDC standard shipping and discounted Blue Dart express delivery. Set to 0 for free delivery on all orders.
            </p>
          </div>

          <div className={styles.visibility} style={{ marginTop: 8 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiTruck aria-hidden="true" style={{ color: "#26784a" }} /> Active Courier Rules Preview
              </label>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#2a4334" }}>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>📦 DTDC Standard:</strong> ₹{dtdcCharge.toLocaleString("en-IN")} {threshold > 0 ? `(FREE on orders ₹${threshold.toLocaleString("en-IN")}+)` : "(FREE on all orders)"} · Takes more time, condition is good.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>⚡ Blue Dart Express:</strong> ₹{bluedartCharge.toLocaleString("en-IN")} {threshold > 0 ? `(Upgrade for ₹${Math.max(0, bluedartCharge - dtdcCharge).toLocaleString("en-IN")} on orders ₹${threshold.toLocaleString("en-IN")}+)` : `(₹${Math.max(0, bluedartCharge - dtdcCharge).toLocaleString("en-IN")} on all orders)`} · Fast delivery & great plant quality.
                </p>
              </div>
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
