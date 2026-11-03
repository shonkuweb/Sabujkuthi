"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FiArrowUpRight, FiBox, FiGrid, FiSettings, FiShoppingBag } from "react-icons/fi";
import BusinessLogo from "../components/BusinessLogo";
import styles from "./page.module.css";
import CategoriesPanel from "./components/CategoriesPanel";
import InventoryPanel from "./components/InventoryPanel";
import OrdersPanel from "./components/OrdersPanel";
import StoreSettingsPanel from "./components/StoreSettingsPanel";

const tabs = [
  { id: "inventory", label: "Inventory", icon: FiBox },
  { id: "category", label: "Categories", icon: FiGrid },
  { id: "orders", label: "Orders", icon: FiShoppingBag },
  { id: "settings", label: "Store Settings", icon: FiSettings },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("inventory");
  const tabRefs = useRef([]);
  const currentTab = tabs.find((tab) => tab.id === activeTab);
  const Icon = currentTab.icon;

  const navigateTabs = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={styles.admin}>
      <header className={styles.header}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            <BusinessLogo className={styles.brandLogo} />
            <div><span>Store administration</span></div>
          </div>
          <Link href="/" className={styles.storeLink}>View store <FiArrowUpRight aria-hidden="true" /></Link>
        </div>
        <nav className={styles.nav} aria-label="Admin navigation">
          <div className={styles.tabs} role="tablist" aria-label="Store management">
            {tabs.map(({ id, label, icon: TabIcon }, index) => (
              <button
                key={id}
                ref={(element) => { tabRefs.current[index] = element; }}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-controls={`panel-${id}`}
                aria-selected={activeTab === id}
                tabIndex={activeTab === id ? 0 : -1}
                className={styles.tab}
                onClick={() => setActiveTab(id)}
                onKeyDown={(event) => navigateTabs(event, index)}
              >
                <TabIcon aria-hidden="true" />{label}
              </button>
            ))}
          </div>
        </nav>
      </header>
      <main className={styles.main}>
        {tabs.map(({ id, label }) => (
          <section key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={activeTab !== id} tabIndex={0}>
            <p className={styles.eyebrow}>STORE MANAGEMENT</p>
            <h1>{label}</h1>
            {id === "category" ? <CategoriesPanel /> : id === "inventory" ? <InventoryPanel /> : id === "orders" ? <OrdersPanel active={activeTab === "orders"} /> : id === "settings" ? <StoreSettingsPanel active={activeTab === "settings"} /> : <div className={styles.placeholder}>
              <span className={styles.placeholderIcon}><Icon aria-hidden="true" /></span>
              <h2>{label}</h2>
              <p>This workspace is ready for your {label.toLowerCase()} features.</p>
            </div>}
          </section>
        ))}
      </main>
    </div>
  );
}
