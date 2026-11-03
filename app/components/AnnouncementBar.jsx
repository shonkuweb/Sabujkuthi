import { FREE_DELIVERY_THRESHOLD } from "../../lib/shipping.mjs";

export default function AnnouncementBar() {
  return <div className="announcement-bar">Free Delivery on orders ₹{FREE_DELIVERY_THRESHOLD.toLocaleString('en-IN')} and above</div>;
}
