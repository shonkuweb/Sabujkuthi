"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiMonitor,
  FiSmartphone,
  FiTrash2,
  FiUpload
} from "react-icons/fi";
import styles from "./CategoriesPanel.module.css";
import heroStyles from "./HeroSettingsEditor.module.css";

export default function HeroSettingsEditor({ onSavingChange }) {
  const [settings, setSettings] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingSection, setUploadingSection] = useState(null); // 'mobile' | 'desktop' | null
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const [isMobileDragging, setIsMobileDragging] = useState(false);
  const [isDesktopDragging, setIsDesktopDragging] = useState(false);

  const mobileFileInputRef = useRef(null);
  const desktopFileInputRef = useRef(null);

  const load = async () => {
    setError("");
    try {
      const response = await fetch("/api/store-settings/hero", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load hero banner settings.");
      setSettings({
        ...data,
        mobileHeroImages: data.mobileHeroImages || [],
        desktopHeroImages: data.desktopHeroImages || data.heroImages || [],
        heroImages: data.heroImages || data.desktopHeroImages || [],
      });
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

  const processFiles = async (type, fileList) => {
    if (!fileList || !fileList.length || !settings) return;
    setError("");
    setNotice("");

    const key = type === "mobile" ? "mobileHeroImages" : "desktopHeroImages";
    const currentList = settings[key] || [];

    if (currentList.length >= 5) {
      setError(`Maximum 5 ${type} hero banner images allowed. Remove an image to add a new one.`);
      return;
    }

    const availableSlots = 5 - currentList.length;
    const filesToUpload = Array.from(fileList).slice(0, availableSlots);

    setUploading(true);
    setUploadingSection(type);
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
            filename: file.name || `${type}_hero_banner.jpg`,
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

      setSettings((current) => {
        const nextList = [...(current[key] || []), ...uploadedUrls].slice(0, 5);
        const updated = {
          ...current,
          [key]: nextList,
        };
        // Keep fallback heroImages synced with desktop list
        if (type === "desktop" || !updated.heroImages || updated.heroImages.length === 0) {
          updated.heroImages = type === "desktop" ? nextList : updated.heroImages;
        }
        return updated;
      });

      setNotice(
        uploadedUrls.length === 1
          ? `1 ${type} hero banner uploaded to Cloudflare R2 successfully.`
          : `${uploadedUrls.length} ${type} hero banners uploaded to Cloudflare R2 successfully.`
      );
    } catch (err) {
      setError(err.message || "Failed to upload image(s).");
    } finally {
      setUploading(false);
      setUploadingSection(null);
    }
  };

  const handleUploadImage = (type, event) => {
    const files = event.target.files;
    event.target.value = "";
    if (files && files.length) {
      processFiles(type, files);
    }
  };

  const moveImage = (type, index, direction) => {
    const key = type === "mobile" ? "mobileHeroImages" : "desktopHeroImages";
    setSettings((current) => {
      const list = [...(current[key] || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return current;
      [list[index], list[targetIndex]] = [list[targetIndex], list[index]];

      const updated = { ...current, [key]: list };
      if (type === "desktop") {
        updated.heroImages = list;
      }
      return updated;
    });
  };

  const removeImage = (type, index) => {
    const key = type === "mobile" ? "mobileHeroImages" : "desktopHeroImages";
    setSettings((current) => {
      const list = (current[key] || []).filter((_, i) => i !== index);
      const updated = { ...current, [key]: list };
      if (type === "desktop") {
        updated.heroImages = list;
      }
      return updated;
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        ...settings,
        mobileHeroImages: settings.mobileHeroImages || [],
        desktopHeroImages: settings.desktopHeroImages || [],
        heroImages: (settings.desktopHeroImages && settings.desktopHeroImages.length > 0)
          ? settings.desktopHeroImages
          : (settings.heroImages || []),
      };

      const response = await fetch("/api/store-settings/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save hero banner settings.");

      setSettings({
        ...data,
        mobileHeroImages: data.mobileHeroImages || [],
        desktopHeroImages: data.desktopHeroImages || data.heroImages || [],
        heroImages: data.heroImages || data.desktopHeroImages || [],
      });
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

  const mobileImages = settings.mobileHeroImages || [];
  const desktopImages = settings.desktopHeroImages || [];

  return (
    <div className={heroStyles.editorWrapper}>
      <p className={heroStyles.introHint}>
        Configure dynamic hero banners with separate mobile and desktop uploads (hosted on Cloudflare R2), plus scrolling tickers.
      </p>

      <form onSubmit={save} aria-label="Hero banner settings">
        <fieldset className={styles.fields} disabled={saving || uploading}>
          {/* SECTION 1: MOBILE HERO BANNERS */}
          <section className={heroStyles.section} aria-labelledby="heading-mobile-banners">
            <div className={heroStyles.sectionHeader}>
              <div className={heroStyles.sectionTitleWrap}>
                <span className={heroStyles.sectionIcon} aria-hidden="true">
                  <FiSmartphone />
                </span>
                <h3 id="heading-mobile-banners" className={heroStyles.sectionHeading}>
                  1. Mobile Hero Banners
                </h3>
              </div>
              <span className={heroStyles.sectionBadge}>
                Visible on Mobile Screen (&lt; 768px)
              </span>
            </div>

            <p className={heroStyles.sectionHint}>
              Upload up to 5 images displayed on mobile phones and small screens. Recommended aspect ratio: 4:3, 1:1, or 9:16 portrait/square banners (e.g. 1080×1080 or 1080×1350).
            </p>

            {mobileImages.length > 0 && (
              <div className={heroStyles.mobileImageList} role="list" aria-label="Mobile hero banner images">
                {mobileImages.map((url, index) => (
                  <div key={url + index} className={heroStyles.mobileCard} role="listitem">
                    <div className={heroStyles.mobilePreviewWrap}>
                      <img src={url} alt={`Mobile hero banner ${index + 1}`} className={heroStyles.mobileImg} />
                    </div>
                    <div className={heroStyles.mobileCardFooter}>
                      <span className={heroStyles.cardLabel}>
                        Mobile Banner {index + 1} of {mobileImages.length}
                      </span>
                      <div className={heroStyles.cardActions}>
                        <button
                          type="button"
                          className={heroStyles.actionButton}
                          aria-label={`Move mobile banner ${index + 1} left/up`}
                          disabled={index === 0}
                          onClick={() => moveImage("mobile", index, -1)}
                        >
                          <FiArrowUp />
                        </button>
                        <button
                          type="button"
                          className={heroStyles.actionButton}
                          aria-label={`Move mobile banner ${index + 1} right/down`}
                          disabled={index === mobileImages.length - 1}
                          onClick={() => moveImage("mobile", index, 1)}
                        >
                          <FiArrowDown />
                        </button>
                        <button
                          type="button"
                          className={`${heroStyles.actionButton} ${heroStyles.actionButtonDelete}`}
                          aria-label={`Remove mobile banner ${index + 1}`}
                          onClick={() => removeImage("mobile", index)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mobileImages.length === 0 && (
              <div className={heroStyles.emptyNotice}>
                No mobile banners added yet. If left empty, desktop banners will automatically be displayed on mobile devices as a fallback.
              </div>
            )}

            <input
              ref={mobileFileInputRef}
              className={heroStyles.fileInputHidden}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading || saving || mobileImages.length >= 5}
              onChange={(e) => handleUploadImage("mobile", e)}
            />

            <div
              className={`${heroStyles.dropzone} ${isMobileDragging ? heroStyles.dropzoneDragging : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsMobileDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsMobileDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsMobileDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsMobileDragging(false);
                if (!uploading && !saving && mobileImages.length < 5) {
                  processFiles("mobile", e.dataTransfer.files);
                }
              }}
              onClick={() => {
                if (!uploading && !saving && mobileImages.length < 5) {
                  mobileFileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Upload mobile hero banners"
            >
              <span className={heroStyles.dropzoneIcon}>
                <FiUpload aria-hidden="true" />
              </span>
              <div className={heroStyles.dropzoneText}>
                <strong>
                  {uploading && uploadingSection === "mobile"
                    ? "Uploading mobile banner to Cloudflare R2…"
                    : isMobileDragging
                    ? "Drop mobile image(s) here"
                    : mobileImages.length >= 5
                    ? "Maximum 5 mobile images reached"
                    : "Upload Mobile Banners (Click or Drag & Drop)"}
                </strong>
                <span>
                  {mobileImages.length >= 5
                    ? "Remove an image above to add new ones"
                    : "Select up to 5 JPG, PNG or WebP images optimized for smartphone screens."}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2: DESKTOP HERO BANNERS (COVERS FULL WIDTH IN DESKTOP VIEW) */}
          <section className={heroStyles.section} style={{ marginTop: 20 }} aria-labelledby="heading-desktop-banners">
            <div className={heroStyles.sectionHeader}>
              <div className={heroStyles.sectionTitleWrap}>
                <span className={heroStyles.sectionIcon} aria-hidden="true">
                  <FiMonitor />
                </span>
                <h3 id="heading-desktop-banners" className={heroStyles.sectionHeading}>
                  2. Desktop Hero Banners
                </h3>
              </div>
              <span className={heroStyles.sectionBadge}>
                Visible on Desktop &amp; Tablet (≥ 768px)
              </span>
            </div>

            <p className={heroStyles.sectionHint}>
              Upload up to 5 images displayed on desktop monitors, laptops, and tablets. Covers the full width in desktop view. Recommended aspect ratio: 16:9, 21:9, or panoramic landscape (e.g. 1920×600 or 1920×820).
            </p>

            {desktopImages.length > 0 && (
              <div className={heroStyles.desktopImageList} role="list" aria-label="Desktop hero banner images">
                {desktopImages.map((url, index) => (
                  <div key={url + index} className={heroStyles.desktopCard} role="listitem">
                    <div className={heroStyles.desktopCardHeader}>
                      <div className={heroStyles.cardInfo}>
                        <span className={heroStyles.cardLabel}>
                          Desktop Banner {index + 1} of {desktopImages.length}
                        </span>
                        <span className={heroStyles.cardUrl} title={url}>
                          {url}
                        </span>
                      </div>
                      <div className={heroStyles.cardActions}>
                        <button
                          type="button"
                          className={heroStyles.actionButton}
                          aria-label={`Move desktop banner ${index + 1} up`}
                          disabled={index === 0}
                          onClick={() => moveImage("desktop", index, -1)}
                        >
                          <FiArrowUp />
                        </button>
                        <button
                          type="button"
                          className={heroStyles.actionButton}
                          aria-label={`Move desktop banner ${index + 1} down`}
                          disabled={index === desktopImages.length - 1}
                          onClick={() => moveImage("desktop", index, 1)}
                        >
                          <FiArrowDown />
                        </button>
                        <button
                          type="button"
                          className={`${heroStyles.actionButton} ${heroStyles.actionButtonDelete}`}
                          aria-label={`Remove desktop banner ${index + 1}`}
                          onClick={() => removeImage("desktop", index)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    <div className={heroStyles.desktopPreviewWrap}>
                      <img src={url} alt={`Desktop hero banner ${index + 1}`} className={heroStyles.desktopImg} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {desktopImages.length === 0 && (
              <div className={heroStyles.emptyNotice}>
                No desktop banners added yet. Click &quot;Upload Desktop Banners&quot; below to add your first banner.
              </div>
            )}

            <input
              ref={desktopFileInputRef}
              className={heroStyles.fileInputHidden}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading || saving || desktopImages.length >= 5}
              onChange={(e) => handleUploadImage("desktop", e)}
            />

            <div
              className={`${heroStyles.dropzone} ${isDesktopDragging ? heroStyles.dropzoneDragging : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDesktopDragging(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDesktopDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDesktopDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDesktopDragging(false);
                if (!uploading && !saving && desktopImages.length < 5) {
                  processFiles("desktop", e.dataTransfer.files);
                }
              }}
              onClick={() => {
                if (!uploading && !saving && desktopImages.length < 5) {
                  desktopFileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Upload desktop hero banners"
            >
              <span className={heroStyles.dropzoneIcon}>
                <FiUpload aria-hidden="true" />
              </span>
              <div className={heroStyles.dropzoneText}>
                <strong>
                  {uploading && uploadingSection === "desktop"
                    ? "Uploading desktop banner to Cloudflare R2…"
                    : isDesktopDragging
                    ? "Drop desktop image(s) here"
                    : desktopImages.length >= 5
                    ? "Maximum 5 desktop images reached"
                    : "Upload Desktop Banners (Click or Drag & Drop)"}
                </strong>
                <span>
                  {desktopImages.length >= 5
                    ? "Remove an image above to add new ones"
                    : "Select up to 5 widescreen JPG, PNG or WebP images spanning the full width of desktop screens."}
                </span>
              </div>
            </div>
          </section>

          {/* Below Ticker Text */}
          <div style={{ marginTop: 24 }}>
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
          </div>

          {/* End Ticker Text */}
          <div>
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
            <button type="submit" className={styles.primary} disabled={saving || uploading}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
