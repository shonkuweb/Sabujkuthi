"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiLock } from "react-icons/fi";
import styles from "./CategoriesPanel.module.css";

export default function PasswordSettingsEditor({ onSavingChange }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onSavingChange(saving);
  }, [saving, onSavingChange]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update password.");
      }

      setNotice("Admin password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "An error occurred while updating the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.workspace}>
      <p className={styles.hint}>
        Update the secret password used to access this admin panel. Keep your credentials secure.
      </p>

      <form className={styles.editor} onSubmit={handleSubmit} aria-label="Update admin password">
        <fieldset className={styles.fields} disabled={saving}>
          <label className={styles.label} htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            className={styles.nameInput}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />

          <label className={styles.label} htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={6}
            maxLength={200}
            autoComplete="new-password"
            className={styles.nameInput}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
          />

          <label className={styles.label} htmlFor="confirm-password">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={6}
            maxLength={200}
            autoComplete="new-password"
            className={styles.nameInput}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
          />

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
              <FiLock aria-hidden="true" />
              {saving ? "Updating…" : "Update password"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
