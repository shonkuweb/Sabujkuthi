"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
import { buildCategoryTree } from "../../lib/category-tree.mjs";

const StoreSearchContext = createContext(null);
export function useStoreSearch() { return useContext(StoreSearchContext); }

export default function StoreShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const allCategories = useCategories();
  const categories = allCategories.filter(category => category.isVisible !== false);
  const navCategories = categories.filter(category => category.isVisibleInNav !== false);
  const navCategoryTree = useMemo(() => buildCategoryTree(navCategories), [navCategories]);
  const [mobileExpandedCatIds, setMobileExpandedCatIds] = useState(new Set());
  const toggleMobileCat = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileExpandedCatIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const { items, setIsSidebarOpen } = useCart();
  const { customer, logout } = useCustomer();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const isAdmin = pathname.startsWith('/admin');
  const isHome = pathname === '/';
  const categorySlug = pathname.startsWith('/category/')
    ? pathname.replace('/category/', '').split('/')[0].split('?')[0]
    : null;
  const currentCategory = categorySlug ? allCategories.find(c => c.slug === categorySlug) : null;
  const currentSubcategories = currentCategory
    ? categories.filter(c => c.parentId === currentCategory.id)
    : [];

  const homeCategories = navCategories.filter(c => !c.parentId);
  const displayHomeCategories = homeCategories.length > 0 ? homeCategories : navCategories;
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
        {/* Mobile Header (active < 1024px) */}
        <header className="header mobile-header">
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

        {/* Mobile Search Wrap (active < 1024px) */}
        <form className="search-wrap mobile-search-wrap" onSubmit={search} role="search">
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

        {/* Desktop Header (active >= 1024px) */}
        <header className="desktop-header">
          <div className="desktop-header-inner">
            <Link href="/" className="desktop-logo-link" aria-label={`${business.name} home`} onClick={() => setSearchQuery('')}>
              <BusinessLogo className="desktop-store-logo" />
            </Link>

            <form className="desktop-search-form" onSubmit={search} role="search">
              <div className="desktop-search-box">
                <FiSearch className="desktop-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search plants, pots, fertilizers, gardening tools..."
                  aria-label="Search plants and products"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                />
                <button type="submit" className="desktop-search-btn" aria-label="Search">
                  Search
                </button>
              </div>
            </form>

            <div className="desktop-header-actions">
              <Link
                href={customer ? "/account" : "/login"}
                className="desktop-header-action-item customer-account-btn"
                aria-label={customer ? `My Account (${customer.name || customer.phone})` : "Customer Login / Sign Up"}
                title={customer ? "My Account" : "Customer Login"}
              >
                <span className="desktop-user-icon-wrap">
                  <FiUser className="desktop-action-icon" aria-hidden="true" />
                  {customer && <span className="user-active-dot" aria-hidden="true" />}
                </span>
                <span className="desktop-action-label">
                  {customer ? (customer.name ? customer.name.split(' ')[0] : customer.phone) : "Sign In"}
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Desktop Navigation Bar (active >= 1024px) */}
        <nav className="desktop-nav-bar" aria-label="Desktop primary navigation">
          <div className="desktop-nav-inner">
            <div className="desktop-nav-links">
              <Link
                href="/"
                className={`desktop-nav-link ${pathname === '/' ? 'active' : ''}`}
                onClick={() => setSearchQuery('')}
              >
                <FiHome className="desktop-nav-icon" aria-hidden="true" />
                <span>Home</span>
              </Link>
              <Link
                href="/collection"
                className={`desktop-nav-link ${pathname === '/collection' ? 'active' : ''}`}
              >
                <FaLeaf className="desktop-nav-icon" aria-hidden="true" />
                <span>All Plants</span>
              </Link>
              <Link
                href="/track-order"
                className={`desktop-nav-link ${pathname === '/track-order' ? 'active' : ''}`}
              >
                <FiTruck className="desktop-nav-icon" aria-hidden="true" />
                <span>Track Order</span>
              </Link>
              <Link
                href="/contact"
                className={`desktop-nav-link ${pathname === '/contact' ? 'active' : ''}`}
              >
                <FiPhoneCall className="desktop-nav-icon" aria-hidden="true" />
                <span>Contact Us</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Homepage Circular Categories Row */}
        {isHome && displayHomeCategories.length > 0 && (
          <section id="categories" className="category-row" aria-label="Plant categories">
            {displayHomeCategories.map((category, index) => (
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

        {/* Circular Subcategories Row Under Navbar when viewing a Category with Subcategories */}
        {!isHome && currentSubcategories.length > 0 && (
          <section id="subcategories" className="category-row" aria-label={`${currentCategory?.name || 'Category'} subcategories`}>
            {currentSubcategories.map((sub, index) => (
              <Link
                key={sub.id}
                href={`/category/${sub.slug}`}
                className="category-modern"
                onClick={() => setSearchQuery('')}
              >
                <div className={`category-icon-modern tone-${index % 2 === 0 ? 'a' : 'b'}`}>
                  {sub.image ? (
                    <img
                      src={sub.image}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    />
                  ) : (
                    <FaLeaf />
                  )}
                </div>
                <span className="category-name">{sub.name}</span>
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
                    {navCategoryTree.map(category => (
                      <div key={category.id} className="accordion-category-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Link
                            href={`/category/${category.slug}`}
                            className="accordion-category-item"
                            style={{ flex: 1, fontWeight: category.children?.length ? 600 : 400 }}
                            onClick={() => { closeMenu(); setSearchQuery(''); }}
                          >
                            <span className="accordion-category-dot">🌿</span>
                            <span className="accordion-category-name">{category.name}</span>
                          </Link>
                          {category.children?.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => toggleMobileCat(category.id, e)}
                              style={{ background: 'none', border: 'none', padding: '10px 14px', cursor: 'pointer', color: '#15803d' }}
                              aria-label={`Drop down subcategories for ${category.name}`}
                            >
                              <FiChevronDown style={{ transform: mobileExpandedCatIds.has(category.id) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                          )}
                        </div>
                        {category.children?.length > 0 && mobileExpandedCatIds.has(category.id) && (
                          <div style={{ paddingLeft: '1.25rem', background: 'rgba(38, 120, 74, 0.04)', borderRadius: '6px', margin: '2px 0 6px' }}>
                            {category.children.map(sub => (
                              <Link
                                key={sub.id}
                                href={`/category/${sub.slug}`}
                                className="accordion-category-item"
                                style={{ padding: '8px 10px', fontSize: '0.88rem' }}
                                onClick={() => { closeMenu(); setSearchQuery(''); }}
                              >
                                <span style={{ marginRight: '6px', opacity: 0.6 }}>↳</span>
                                <span>{sub.name}</span>
                                <FiChevronRight className="accordion-item-arrow" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
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
