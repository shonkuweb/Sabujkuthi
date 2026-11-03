"use client";

import { useStoreSettings } from "../context/StoreSettingsContext";
import { FREE_DELIVERY_THRESHOLD } from "../../lib/shipping.mjs";

export default function AnnouncementBar() {
  const { heroSettings, deliverySettings } = useStoreSettings();

  if (heroSettings?.announcementVisible === false) {
    return null;
  }

  const customText = heroSettings?.announcementText?.trim();
  const threshold = deliverySettings?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD;
  const message = customText || `Free Delivery on orders ₹${threshold.toLocaleString('en-IN')} and above`;

  return <div className="announcement-bar">{message}</div>;
}
