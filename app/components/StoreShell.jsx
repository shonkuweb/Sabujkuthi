"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiChevronRight,
  FiCreditCard,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiPhoneCall,
  FiSearch,
  FiShoppingBag,
  FiTruck,
  FiUser,
  FiX
} from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import AnnouncementBar from "./AnnouncementBar";
import BusinessLogo from "./BusinessLogo";
import FloatingCart from "./FloatingCart";
import { business } from "../../lib/business.mjs";
import SiteFooter from "./SiteFooter";
import { useCategories } from "../hooks/useCategories";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";

const StoreSearchContext = createContext(null);
export function useStoreSearch() { return useContext(StoreSearchContext); }

export default function StoreShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const allCategories = useCategories();
  const categories = allCategories.filter(category => category.isVisible !== false);
  const navCategories = categories.filter(category => category.isVisibleInNav !== false);
  const { items, setIsSidebarOpen } = useCart();
  const { customer, logout } = useCustomer();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const isAdmin = pathname.startsWith('/admin');
  const isHome = pathname === '/';
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);

  useEffect(() => {
    setMenuOpen(false);
    setCategoriesExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = event => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', closeOnEscape); };
  }, [menuOpen]);

  if (isAdmin) return children;

  const closeMenu = () => {
    setMenuOpen(false);
    setCategoriesExpanded(false);
  };

  const openCart = () => {
    closeMenu();
    setIsSidebarOpen(true);
  };

  const search = event => {
    event.preventDefault();
    if (pathname !== '/collection') router.push('/collection');
    else document.getElementById('collection-results')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    closeMenu();
    router.push('/');
  };

  return (
    <StoreSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className="mobile-page">
        <AnnouncementBar />
        <header className="header">
          <button type="button" className="icon-btn" aria-label="Open navigation menu" onClick={() => setMenuOpen(true)}>
            <FiMenu />
          </button>
          <Link href="/" className="header-center" aria-label={`${business.name} home`} onClick={() => setSearchQuery('')}>
            <BusinessLogo className="store-logo" />
          </Link>
          <div className="header-actions">
            {/* Man icon in the navbar leads to user login or customer account page, not admin panel */}
            <Link
              href={customer ? "/account" : "/login"}
              className="icon-btn customer-account-btn"
              aria-label={customer ? `My Account (${customer.name || customer.phone})` : "Customer Login / Sign Up"}
              title={customer ? "My Account" : "Customer Login"}
            >
              <FiUser />
              {customer && <span className="user-active-dot" aria-hidden="true" />}
            </Link>
            <button type="button" className="icon-btn cart-header-btn" aria-label="Open cart" onClick={openCart}>
              <FiShoppingBag />
              {cartCount > 0 && <span className="cart-badge-count">{cartCount > 99 ? '99+' : cartCount}</span>}
            </button>
          </div>
        </header>

        <form className="search-wrap" onSubmit={search} role="search">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="search"
              placeholder="Search plants, pots, fertilizers..."
              aria-label="Search plants and products"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
          </div>
        </form>

        {isHome && navCategories.length > 0 && (
          <section id="categories" className="category-row" aria-label="Plant categories">
            {navCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="category-modern"
                onClick={() => setSearchQuery('')}
              >
                <div className={`category-icon-modern tone-${index % 2 === 0 ? 'a' : 'b'}`}>
                  {category.image ? (
                    <img
                      src={category.image}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    />
                  ) : (
                    <FaLeaf />
                  )}
                </div>
                <span className="category-name">{category.name}</span>
              </Link>
            ))}
          </section>
        )}

        {children}
        <SiteFooter />

        {/* Hamburger Modal Drawer */}
        {menuOpen && <button className="menu-overlay blur-overlay" aria-label="Close menu overlay" onClick={closeMenu} />}
        <aside className={`side-menu ${menuOpen ? 'open' : ''}`} aria-label="Website navigation menu">
          <div className="side-menu-head">
            <div className="side-menu-title-wrap">
              <span className="side-menu-leaf-badge"><FaLeaf /></span>
              <strong>Menu</strong>
            </div>
            <button type="button" className="close-btn-modern" aria-label="Close menu" onClick={closeMenu}>
              <FiX />
            </button>
          </div>

          <div className="side-menu-body">
            <nav className="side-menu-links">
              {/* 1. Home */}
              <Link href="/" className="side-menu-link" onClick={() => { closeMenu(); setSearchQuery(''); }}>
                <div className="side-menu-item-left">
                  <span className="side-menu-icon-wrap"><FiHome /></span>
                  <span className="side-menu-text">Home</span>
                </div>
                <FiChevronRight className="side-menu-arrow" />
              </Link>

              {/* 2. Cart */}
              <button type="button" className="side-menu-link-btn" onClick={openCart}>
                <div className="side-menu-item-left">
                  <span className="side-menu-icon-wrap"><FiShoppingBag /></span>
                  <span className="side-menu-text">Cart</span>
                </div>
                {cartCount > 0 && <span className="menu-cart-count">{cartCount}</span>}
                <FiChevronRight className="side-menu-arrow" />
              </button>

              {/* 3. Plant Collection */}
              <Link href="/collection" className="side-menu-link" onClick={closeMenu}>
                <div className="side-menu-item-left">
                  <span className="side-menu-icon-wrap"><FaLeaf /></span>
                  <span className="side-menu-text">Plant Collection</span>
                </div>
                <FiChevronRight className="side-menu-arrow" />
              </Link>

              {/* 4. Categories Dropdown */}
              <div className="side-menu-accordion">
                <button
                  type="button"
                  className={`side-menu-link-btn ${categoriesExpanded ? 'active' : ''}`}
                  onClick={() => setCategoriesExpanded(prev => !prev)}
                  aria-expanded={categoriesExpanded}
                >
                  <div className="side-menu-item-left">
                    <span className="side-menu-icon-wrap"><FiLayers /></span>
                    <span className="side-menu-text">Categories</span>
                  </div>
                  <FiChevronDown className={`accordion-chevron ${categoriesExpanded ? 'rotated' : ''}`} />
                </button>
                {categoriesExpanded && (
                  <div className="accordion-categories-list" id="menu-categories-list">
                    {navCategories.map(category => (
                      <Link
                        key={category.id}
                        href={`/category/${category.slug}`}
                        className="accordion-category-item"
                        onClick={() => { closeMenu(); setSearchQuery(''); }}
                      >
                        <span className="accordion-category-dot">🌿</span>
                        <span className="accordion-category-name">{category.name}</span>
                        <FiChevronRight className="accordion-item-arrow" />
                      </Link>
                    ))}
                    <Link
                      href="/collection"
                      className="accordion-category-item view-all"
                      onClick={closeMenu}
                    >
                      <span className="accordion-category-dot">🔍</span>
                      <span className="accordion-category-name">Browse All Plants</span>
                      <FiChevronRight className="accordion-item-arrow" />
                    </Link>
                  </div>
                )}
              </div>

              {/* 5. Checkout */}
              <Link href="/checkout" className="side-menu-link" onClick={closeMenu}>
                <div className="side-menu-item-left">
                  <span className="side-menu-icon-wrap"><FiCreditCard /></span>
                  <span className="side-menu-text">Checkout</span>
                </div>
                <FiChevronRight className="side-menu-arrow" />
              </Link>

              {/* 6. Track Your Order */}
              <Link href="/track-order" className="side-menu-link" onClick={closeMenu}>
                <div className="side-menu-item-left">
                  <span className="side-menu-icon-wrap"><FiTruck /></span>
                  <span className="side-menu-text">Track Your Order</span>
                </div>
                <FiChevronRight className="side-menu-arrow" />
              </Link>

              {/* 7. Contact Us */}
              <Link href="/contact" className="side-menu-link" onClick={closeMenu}>
                <div className="side-menu-item-left">
                  <span className="side-menu-icon-wrap"><FiPhoneCall /></span>
                  <span className="side-menu-text">Contact Us</span>
                </div>
                <FiChevronRight className="side-menu-arrow" />
              </Link>

              {/* 8. Account */}
              <Link
                href={customer ? "/account" : "/login"}
                className="side-menu-link"
                onClick={closeMenu}
              >
                <div className="side-menu-item-left">
                  <span className="side-menu-icon-wrap"><FiUser /></span>
                  <span className="side-menu-text">{customer ? "My Account" : "Account (Login / Sign Up)"}</span>
                </div>
                <FiChevronRight className="side-menu-arrow" />
              </Link>
            </nav>
          </div>

          {/* Clean User & Support Footer (No categories pinned at the bottom!) */}
          <div className="side-menu-footer">
            {customer ? (
              <div className="menu-user-card">
                <div className="menu-user-info">
                  <div className="menu-user-avatar">
                    {(customer.name ? customer.name[0] : customer.phone[0] || 'U').toUpperCase()}
                  </div>
                  <div className="menu-user-details">
                    <p className="menu-user-name">{customer.name || 'Valued Customer'}</p>
                    <p className="menu-user-phone">+91 {customer.phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="menu-logout-btn"
                  onClick={handleLogout}
                  aria-label="Log out of account"
                  title="Log out"
                >
                  <FiLogOut />
                </button>
              </div>
            ) : (
              <div className="menu-guest-actions">
                <Link href="/login" className="menu-guest-btn login" onClick={closeMenu}>
                  Log In
                </Link>
                <Link href="/login?mode=signup" className="menu-guest-btn signup" onClick={closeMenu}>
                  Sign Up
                </Link>
              </div>
            )}
            <div className="menu-support-note">
              <span>Need help? </span>
              <a href={`tel:${business.phone}`} className="menu-support-link">{business.phone}</a>
            </div>
          </div>
        </aside>

        <FloatingCart hidden={menuOpen} />
      </div>
    </StoreSearchContext.Provider>
  );
}
