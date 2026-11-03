"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiChevronRight, FiMenu, FiSearch, FiShoppingBag, FiUser, FiX } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import AnnouncementBar from "./AnnouncementBar";
import BusinessLogo from "./BusinessLogo";
import FloatingCart from "./FloatingCart";
import { business } from "../../lib/business.mjs";
import SiteFooter from "./SiteFooter";
import { useCategories } from "../hooks/useCategories";
import { useCart } from "../context/CartContext";

const StoreSearchContext = createContext(null);
export function useStoreSearch() { return useContext(StoreSearchContext); }

export default function StoreShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const allCategories = useCategories();
  const categories = allCategories.filter(category => category.isVisible !== false);
  const navCategories = categories.filter(category => category.isVisibleInNav !== false);
  const { setIsSidebarOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = pathname.startsWith('/admin');
  const isHome = pathname === '/';

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = event => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', closeOnEscape); };
  }, [menuOpen]);

  if (isAdmin) return children;
  const closeMenu = () => setMenuOpen(false);
  const openCart = () => { closeMenu(); setIsSidebarOpen(true); };
  const search = event => {
    event.preventDefault();
    if (pathname !== '/collection') router.push('/collection');
    else document.getElementById('collection-results')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <StoreSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className="mobile-page">
        <AnnouncementBar />
        <header className="header">
          <button type="button" className="icon-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}><FiMenu /></button>
          <Link href="/" className="header-center" aria-label={`${business.name} home`} onClick={() => setSearchQuery('')}>
            <BusinessLogo className="store-logo" />
          </Link>
          <div className="header-actions">
            <Link href="/admin" className="icon-btn" aria-label="Admin Panel"><FiUser /></Link>
            <button type="button" className="icon-btn" aria-label="Shopping bag" onClick={openCart}><FiShoppingBag /></button>
          </div>
        </header>
        <form className="search-wrap" onSubmit={search} role="search">
          <div className="search-box"><FiSearch className="search-icon" /><input type="search" placeholder="Search plants, pots..." aria-label="Search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></div>
        </form>
        {isHome && navCategories.length > 0 && <section id="categories" className="category-row" aria-label="Plant categories">
          {navCategories.map((category, index) => <Link key={category.id} href={`/category/${category.slug}`} className="category-modern" onClick={() => setSearchQuery('')}>
            <div className={`category-icon-modern tone-${index % 2 === 0 ? 'a' : 'b'}`}>{category.image ? <img src={category.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : <FaLeaf />}</div>
            <span className="category-name">{category.name}</span>
          </Link>)}
        </section>}
        {children}
        <SiteFooter />
        {menuOpen && <button className="menu-overlay" aria-label="Close menu overlay" onClick={closeMenu} />}
        <aside className={`side-menu ${menuOpen ? 'open' : ''}`} aria-label="Website menu">
          <div className="side-menu-head"><strong>Menu</strong><button type="button" className="icon-btn" aria-label="Close menu" onClick={closeMenu}><FiX /></button></div>
          <nav className="side-menu-links">
            <Link href="/" onClick={() => { closeMenu(); setSearchQuery(''); }}>Home<FiChevronRight /></Link>
            <button type="button" className="side-menu-link-btn" onClick={openCart}>Cart<FiChevronRight /></button>
            <Link href="/collection" onClick={closeMenu}>Plant Collection<FiChevronRight /></Link>
            <Link href="/checkout" onClick={closeMenu}>Checkout<FiChevronRight /></Link>
            <Link href="/contact" onClick={closeMenu}>Contact Us<FiChevronRight /></Link>
          </nav>
          <div className="menu-categories"><p>Categories</p><div className="menu-category-grid">
            {navCategories.map(category => <Link key={category.id} href={`/category/${category.slug}`} className="menu-category-item" onClick={() => { closeMenu(); setSearchQuery(''); }}>{category.name}</Link>)}
          </div></div>
        </aside>
        <FloatingCart hidden={menuOpen} />
      </div>
    </StoreSearchContext.Provider>
  );
}
