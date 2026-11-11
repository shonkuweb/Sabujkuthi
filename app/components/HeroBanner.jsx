"use client";

import { useEffect, useState, useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { business } from "../../lib/business.mjs";
import styles from "./HeroBanner.module.css";

function CarouselSlider({ images, variant, className = "" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  useEffect(() => {
    if (images.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((curr) => (curr + 1) % images.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [images.length, isPaused]);

  const handleTouchStart = (e) => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && images.length > 1) {
      if (diff > 0) {
        setCurrentIndex((curr) => (curr + 1) % images.length);
      } else {
        setCurrentIndex((curr) => (curr - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
  };

  if (!images || images.length === 0) return null;

  return (
    <section
      className={`${styles.container} ${variant === "mobile" ? styles.mobileContainer : styles.desktopContainer} ${className}`}
      role="region"
      aria-label={`${business.name} ${variant} hero banner`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.slides}>
        {images.map((url, idx) => (
          <div
            key={url + idx}
            className={`${styles.slide} ${idx === currentIndex ? styles.slideActive : ""}`}
            aria-hidden={idx !== currentIndex}
          >
            <img
              src={url}
              alt={`${business.name} banner slide ${idx + 1}`}
              className={styles.image}
              loading={idx === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className={`${styles.navButton} ${styles.prev}`}
            aria-label={`Previous ${variant} banner`}
            onClick={() => setCurrentIndex((curr) => (curr - 1 + images.length) % images.length)}
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${styles.next}`}
            aria-label={`Next ${variant} banner`}
            onClick={() => setCurrentIndex((curr) => (curr + 1) % images.length)}
          >
            <FiChevronRight aria-hidden="true" />
          </button>
          <div className={styles.dots} role="tablist" aria-label={`${variant} banner indicators`}>
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Show ${variant} banner slide ${idx + 1}`}
                className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ""}`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function HeroBanner() {
  const { heroSettings } = useStoreSettings();
  const mobileImages = (heroSettings?.mobileHeroImages || []).filter(Boolean);
  const desktopImages = (heroSettings?.desktopHeroImages || heroSettings?.heroImages || []).filter(Boolean);
  const legacyImages = (heroSettings?.heroImages || []).filter(Boolean);

  const hasMobile = mobileImages.length > 0;
  const hasDesktop = desktopImages.length > 0;
  const hasLegacy = legacyImages.length > 0;

  // Fallbacks:
  // If store has both mobile and desktop banners:
  // - mobile screen displays mobile banners
  // - desktop screen displays desktop banners
  // If only one exists:
  // - display that banner across both views as fallback
  const effectiveMobileImages = hasMobile ? mobileImages : (hasDesktop ? desktopImages : legacyImages);
  const effectiveDesktopImages = hasDesktop ? desktopImages : (hasMobile ? mobileImages : legacyImages);

  const hasAnyImages = effectiveMobileImages.length > 0 || effectiveDesktopImages.length > 0;
  const hasBothDedicated = hasMobile && hasDesktop;

  const belowTickerText = heroSettings?.belowTickerText?.trim() || `${business.name} · ${business.address}  |  Call / WhatsApp: ${business.phoneDisplay}`;

  if (!hasAnyImages) {
    return (
      <div className="notice">
        <p className="notice-track">{belowTickerText}</p>
      </div>
    );
  }

  return (
    <>
      {hasBothDedicated ? (
        <>
          <CarouselSlider
            images={effectiveMobileImages}
            variant="mobile"
            className={styles.hideOnDesktop}
          />
          <CarouselSlider
            images={effectiveDesktopImages}
            variant="desktop"
            className={styles.hideOnMobile}
          />
        </>
      ) : (
        <CarouselSlider
          images={effectiveDesktopImages.length > 0 ? effectiveDesktopImages : effectiveMobileImages}
          variant={hasMobile && !hasDesktop ? "mobile" : "desktop"}
        />
      )}
      <div className="notice">
        <p className="notice-track">{belowTickerText}</p>
      </div>
    </>
  );
}
