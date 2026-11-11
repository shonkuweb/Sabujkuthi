"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FiArrowUpRight,
  FiBox,
  FiChevronLeft,
  FiGrid,
  FiMenu,
  FiSettings,
  FiShoppingBag,
  FiTrendingUp,
  FiX
} from "react-icons/fi";
import BusinessLogo from "../components/BusinessLogo";
import styles from "./page.module.css";
import DashboardPanel from "./components/DashboardPanel";
import CategoriesPanel from "./components/CategoriesPanel";
import InventoryPanel from "./components/InventoryPanel";
import OrdersPanel from "./components/OrdersPanel";
import StoreSettingsPanel from "./components/StoreSettingsPanel";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: FiTrendingUp },
  { id: "inventory", label: "Inventory", icon: FiBox },
  { id: "category", label: "Categories", icon: FiGrid },
  { id: "orders", label: "Orders", icon: FiShoppingBag },
  { id: "settings", label: "Store Settings", icon: FiSettings },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const tabRefs = useRef([]);
  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const Icon = currentTab.icon;

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 900) {
        setIsSidebarOpen(false);
      } else {
        try {
          const saved = localStorage.getItem("admin_sidebar_open");
          if (saved !== null) {
            setIsSidebarOpen(saved === "true");
          }
        } catch {
          // ignore storage issues
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined" && window.innerWidth >= 900) {
        try {
          localStorage.setItem("admin_sidebar_open", String(next));
        } catch {}
      }
      return next;
    });
  };

  const handleSelectTab = (id) => {
    setActiveTab(id);
    if (typeof window !== "undefined" && window.innerWidth < 900) {
      setIsSidebarOpen(false);
    }
  };

  const navigateTabs = (event, index) => {
    let next;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
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
          <div className={styles.navLeft}>
            <button
              type="button"
              className={styles.sidebarToggleBtn}
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
              aria-expanded={isSidebarOpen}
              aria-controls="admin-sidebar"
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <FiMenu className={styles.toggleIcon} aria-hidden="true" />
              <span className={styles.toggleBtnLabel}>{isSidebarOpen ? "Close" : "Menu"}</span>
            </button>
          </div>

          <div className={styles.navCenter}>
            <BusinessLogo className={styles.brandLogo} />
            <span className={styles.brandSubtitle}>Store administration</span>
          </div>

          <div className={styles.navRight}>
            <Link href="/" className={styles.storeLink}>
              <span>View store</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.layoutContainer}>
        {/* Mobile backdrop */}
        {isSidebarOpen && (
          <div
            className={styles.sidebarOverlay}
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          id="admin-sidebar"
          className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
          aria-label="Admin sidebar"
        >
          <div className={styles.sidebarContent}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarEyebrow}>NAVIGATION</span>
              <button
                type="button"
                className={styles.sidebarCloseBtn}
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close sidebar"
                title="Close sidebar"
              >
                <FiChevronLeft className={styles.closeIconDesktop} aria-hidden="true" />
                <FiX className={styles.closeIconMobile} aria-hidden="true" />
              </button>
            </div>

            <nav className={styles.nav} aria-label="Admin navigation">
              <div
                className={styles.tabs}
                role="tablist"
                aria-orientation="vertical"
                aria-label="Store management"
              >
                {tabs.map(({ id, label, icon: TabIcon }, index) => {
                  const isSelected = activeTab === id;
                  return (
                    <button
                      key={id}
                      ref={(element) => {
                        tabRefs.current[index] = element;
                      }}
                      type="button"
                      role="tab"
                      id={`tab-${id}`}
                      aria-controls={`panel-${id}`}
                      aria-selected={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      className={`${styles.tab} ${isSelected ? styles.tabActive : ""}`}
                      onClick={() => handleSelectTab(id)}
                      onKeyDown={(event) => navigateTabs(event, index)}
                    >
                      <TabIcon className={styles.tabIcon} aria-hidden="true" />
                      <span className={styles.tabLabel}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className={styles.sidebarFooter}>
              <div className={styles.adminStatus}>
                <span className={styles.statusDot} aria-hidden="true" />
                <span className={styles.statusText}>Admin active</span>
              </div>
            </div>
          </div>
        </aside>

        <main className={`${styles.main} ${!isSidebarOpen ? styles.mainExpanded : ""}`}>
          <div className={styles.mainContent}>
            {tabs.map(({ id, label }) => (
              <section
                key={id}
                role="tabpanel"
                id={`panel-${id}`}
                aria-labelledby={`tab-${id}`}
                hidden={activeTab !== id}
                tabIndex={0}
              >
                <div className={styles.panelHeader}>
                  <h1>{label}</h1>
                </div>
                {id === "dashboard" ? (
                  <DashboardPanel active={activeTab === "dashboard"} />
                ) : id === "category" ? (
                  <CategoriesPanel />
                ) : id === "inventory" ? (
                  <InventoryPanel />
                ) : id === "orders" ? (
                  <OrdersPanel active={activeTab === "orders"} />
                ) : id === "settings" ? (
                  <StoreSettingsPanel active={activeTab === "settings"} />
                ) : (
                  <div className={styles.placeholder}>
                    <span className={styles.placeholderIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <h2>{label}</h2>
                    <p>This workspace is ready for your {label.toLowerCase()} features.</p>
                  </div>
                )}
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
