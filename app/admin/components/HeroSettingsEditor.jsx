"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2, FiUpload, FiCheck } from "react-icons/fi";
import styles from "./CategoriesPanel.module.css";
import heroStyles from "./HeroSettingsEditor.module.css";

export default function HeroSettingsEditor({ onSavingChange }) {
  const [settings, setSettings] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    setError("");
    try {
      const response = await fetch("/api/store-settings/hero", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load hero banner settings.");
      setSettings(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSavingChange(saving || uploading);
  }, [saving, uploading, onSavingChange]);

  const processFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    setError("");
    setNotice("");

    const currentCount = (settings.heroImages || []).length;
    if (currentCount >= 5) {
      setError("Maximum 5 hero banner images allowed. Remove an image to add a new one.");
      return;
    }

    const availableSlots = 5 - currentCount;
    const filesToUpload = Array.from(fileList).slice(0, availableSlots);

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of filesToUpload) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error(`"${file.name}" is not a supported format. Please choose JPG, PNG, or WebP.`);
        }

        let compressedFile = file;
        try {
          compressedFile = await imageCompression(file, {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
        } catch (compErr) {
          console.warn("Client compression skipped, using original:", compErr);
        }

        const dataUrl = await imageCompression.getDataUrlFromFile(compressedFile);

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl,
            filename: file.name || "hero_banner.jpg",
          }),
        });

        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          if (res.status === 413) {
            throw new Error(`"${file.name}" is too large for the web server (413).`);
          }
          throw new Error(`Upload failed (status ${res.status}).`);
        }

        if (!res.ok || !data.url) {
          throw new Error(data.error || `Failed to upload "${file.name}" to Cloudflare R2.`);
        }

        uploadedUrls.push(data.url);
      }

      setSettings((current) => ({
        ...current,
        heroImages: [...(current.heroImages || []), ...uploadedUrls].slice(0, 5),
      }));
      setNotice(
        uploadedUrls.length === 1
          ? "Image uploaded to Cloudflare R2 successfully."
          : `${uploadedUrls.length} images uploaded to Cloudflare R2 successfully.`
      );
    } catch (err) {
      setError(err.message || "Failed to upload image(s).");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImage = (event) => {
    const files = event.target.files;
    event.target.value = "";
    if (files && files.length) {
      processFiles(files);
    }
  };

  const moveImage = (index, direction) => {
    setSettings((current) => {
      const list = [...(current.heroImages || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return current;
      [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
      return { ...current, heroImages: list };
    });
  };

  const removeImage = (index) => {
    setSettings((current) => ({
      ...current,
      heroImages: (current.heroImages || []).filter((_, i) => i !== index),
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/store-settings/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save hero banner settings.");

      setSettings(data);
      setNotice("Hero banner settings saved successfully.");

      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("store-settings");
        channel.postMessage("hero-updated");
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
          <p role="status">Loading hero banner settings…</p>
        )}
      </div>
    );
  }

  const heroImages = settings.heroImages || [];

  return (
    <div className={styles.workspace}>
      <p className={styles.hint}>
        Configure dynamic hero banner images (hosted on Cloudflare R2) and homepage tickers.
      </p>

      <form className={styles.editor} onSubmit={save} aria-label="Hero banner settings">
        <fieldset className={styles.fields} disabled={saving || uploading}>
          {/* Hero Banner Images */}
          <h3 className={styles.fieldHeading} style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
            Hero Banner Images
          </h3>
          <p className={styles.hint}>
            Upload up to 5 images for the hero section. Images are uploaded to Cloudflare R2 and will only be displayed as a rotating carousel in the hero section.
          </p>

          {heroImages.length > 0 && (
            <div className={heroStyles.imageList} role="list" aria-label="Hero banner images">
              {heroImages.map((url, index) => (
                <div key={url + index} className={heroStyles.imageCard} role="listitem">
                  <div className={heroStyles.imageThumb}>
                    <img src={url} alt={`Hero banner ${index + 1}`} />
                  </div>
                  <div className={heroStyles.imageInfo}>
                    <strong>Image {index + 1} of {heroImages.length}</strong>
                    <span>{url}</span>
                  </div>
                  <div className={heroStyles.imageActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Move image ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                    >
                      <FiArrowUp />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Move image ${index + 1} down`}
                      disabled={index === heroImages.length - 1}
                      onClick={() => moveImage(index, 1)}
                    >
                      <FiArrowDown />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Remove image ${index + 1}`}
                      onClick={() => removeImage(index)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {heroImages.length === 0 && (
            <p className={styles.hint} style={{ margin: "16px 0" }}>
              No hero images added yet. Click &quot;Upload image&quot; below to add your first banner image.
            </p>
          )}

          <input
            ref={fileInputRef}
            className={styles.fileInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || saving || heroImages.length >= 5}
            onChange={handleUploadImage}
          />

          <div
            className={`${heroStyles.dropzone} ${isDragging ? heroStyles.dropzoneDragging : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!uploading && !saving && heroImages.length < 5) {
                processFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => {
              if (!uploading && !saving && heroImages.length < 5) {
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload hero banner images"
          >
            <span className={heroStyles.dropzoneIcon}>
              <FiUpload aria-hidden="true" />
            </span>
            <div className={heroStyles.dropzoneText}>
              <strong>
                {uploading
                  ? "Uploading to Cloudflare R2…"
                  : isDragging
                  ? "Drop image(s) here"
                  : heroImages.length >= 5
                  ? "Maximum 5 images reached"
                  : "Drag & drop images here, or click to browse"}
              </strong>
              <span>
                {heroImages.length >= 5
                  ? "Remove an image above to add new ones"
                  : "Select or drop up to 5 JPG, PNG or WebP images. Optimized & uploaded to R2 automatically."}
              </span>
            </div>
          </div>

          {/* Below Ticker Text */}
          <h3 className={styles.fieldHeading}>Below Ticker Text</h3>
          <p className={styles.hint}>
            The scrolling marquee notice displayed right underneath the hero banner.
          </p>
          <label className={styles.label} htmlFor="below-ticker-text">
            Below ticker notice
          </label>
          <textarea
            id="below-ticker-text"
            className={styles.nameInput}
            rows={2}
            maxLength={1000}
            required
            value={settings.belowTickerText || ""}
            onChange={(event) =>
              setSettings({ ...settings, belowTickerText: event.target.value })
            }
          />

          {/* End Ticker Text */}
          <h3 className={styles.fieldHeading}>End Ticker Text</h3>
          <p className={styles.hint}>
            The scrolling packing and order preparation notice displayed near the bottom of the page.
          </p>
          <label className={styles.label} htmlFor="end-ticker-text">
            End ticker notice
          </label>
          <textarea
            id="end-ticker-text"
            className={styles.nameInput}
            rows={2}
            maxLength={1000}
            required
            value={settings.endTickerText || ""}
            onChange={(event) =>
              setSettings({ ...settings, endTickerText: event.target.value })
            }
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
            <button type="submit" className={styles.primary} disabled={saving || uploading}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
