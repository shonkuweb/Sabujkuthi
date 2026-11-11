"use client";

import { useStoreSettings } from "../context/StoreSettingsContext";
import { FREE_DELIVERY_THRESHOLD } from "../../lib/shipping.mjs";

export default function AnnouncementBar() {
  const { offersSettings, deliverySettings } = useStoreSettings();

  // If announcement bar is disabled in Offers Settings, do not render
  if (offersSettings?.announcementVisible === false) {
    return null;
  }

  const customText = offersSettings?.announcementText?.trim();
  const threshold = deliverySettings?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD;
  const message = customText || `Free Delivery on orders ₹${threshold.toLocaleString("en-IN")} and above 🌿`;

  return <div className="announcement-bar">{message}</div>;
}
