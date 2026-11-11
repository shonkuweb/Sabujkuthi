"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { defaultHeroSettings } from "../../lib/hero-settings.mjs";
import { defaultDeliverySettings } from "../../lib/delivery-settings.mjs";
import { DEFAULT_OFFERS_SETTINGS } from "../../lib/discounts.mjs";

const StoreSettingsContext = createContext({
  heroSettings: defaultHeroSettings,
  deliverySettings: defaultDeliverySettings,
  offersSettings: DEFAULT_OFFERS_SETTINGS,
  loading: false,
  refresh: async () => {},
});

export function StoreSettingsProvider({ children }) {
  const [heroSettings, setHeroSettings] = useState(defaultHeroSettings);
  const [deliverySettings, setDeliverySettings] = useState(defaultDeliverySettings);
  const [offersSettings, setOffersSettings] = useState(DEFAULT_OFFERS_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [heroRes, deliveryRes, offersRes] = await Promise.all([
        fetch("/api/store-settings/hero", { cache: "no-store" }),
        fetch("/api/store-settings/delivery", { cache: "no-store" }),
        fetch("/api/store-settings/offers", { cache: "no-store" }),
      ]);
      if (heroRes.ok) {
        const heroData = await heroRes.json();
        setHeroSettings(heroData);
      }
      if (deliveryRes.ok) {
        const deliveryData = await deliveryRes.json();
        setDeliverySettings(deliveryData);
      }
      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setOffersSettings(offersData);
      }
    } catch (err) {
      console.warn("Could not load store settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("store-settings") : null;
    if (channel) {
      channel.onmessage = () => {
        refresh();
      };
    }

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      channel?.close();
    };
  }, [refresh]);

  return (
    <StoreSettingsContext.Provider value={{ heroSettings, deliverySettings, offersSettings, loading, refresh }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}
