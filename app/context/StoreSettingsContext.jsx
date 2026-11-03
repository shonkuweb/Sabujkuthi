"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { defaultHeroSettings } from "../../lib/hero-settings.mjs";
import { defaultDeliverySettings } from "../../lib/delivery-settings.mjs";

const StoreSettingsContext = createContext({
  heroSettings: defaultHeroSettings,
  deliverySettings: defaultDeliverySettings,
  loading: false,
  refresh: async () => {},
});

export function StoreSettingsProvider({ children }) {
  const [heroSettings, setHeroSettings] = useState(defaultHeroSettings);
  const [deliverySettings, setDeliverySettings] = useState(defaultDeliverySettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [heroRes, deliveryRes] = await Promise.all([
        fetch("/api/store-settings/hero", { cache: "no-store" }),
        fetch("/api/store-settings/delivery", { cache: "no-store" }),
      ]);
      if (heroRes.ok) {
        const heroData = await heroRes.json();
        setHeroSettings(heroData);
      }
      if (deliveryRes.ok) {
        const deliveryData = await deliveryRes.json();
        setDeliverySettings(deliveryData);
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
    <StoreSettingsContext.Provider value={{ heroSettings, deliverySettings, loading, refresh }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}
