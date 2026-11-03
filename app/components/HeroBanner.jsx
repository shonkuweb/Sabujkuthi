"use client";

import { useEffect, useState, useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { business } from "../../lib/business.mjs";
import styles from "./HeroBanner.module.css";

export default function HeroBanner() {
  const { heroSettings } = useStoreSettings();
  const images = (heroSettings?.heroImages || []).filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const belowTickerText = heroSettings?.belowTickerText?.trim() || `${business.name} · ${business.address}  |  Call / WhatsApp: ${business.phoneDisplay}`;

  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  useEffect(() => {
    if (images.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex(curr => (curr + 1) % images.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [images.length, isPaused]);

  const handleTouchStart = e => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = e => {
    setIsPaused(false);
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && images.length > 1) {
      if (diff > 0) {
        setCurrentIndex(curr => (curr + 1) % images.length);
      } else {
        setCurrentIndex(curr => (curr - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
  };

  return (
    <>
      {images.length > 0 && (
        <section
          className={styles.container}
          role="region"
          aria-label="Nursery hero banner"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.slides}>
            {images.map((url, idx) => (
              <div
                key={url + idx}
                className={`${styles.slide} ${idx === currentIndex ? styles.slideActive : ''}`}
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
                aria-label="Previous banner"
                onClick={() => setCurrentIndex(curr => (curr - 1 + images.length) % images.length)}
              >
                <FiChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.navButton} ${styles.next}`}
                aria-label="Next banner"
                onClick={() => setCurrentIndex(curr => (curr + 1) % images.length)}
              >
                <FiChevronRight aria-hidden="true" />
              </button>
              <div className={styles.dots} role="tablist" aria-label="Banner slide indicators">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={idx === currentIndex}
                    aria-label={`Show banner slide ${idx + 1}`}
                    className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}
      <div className="notice">
        <p className="notice-track">{belowTickerText}</p>
      </div>
    </>
  );
}
