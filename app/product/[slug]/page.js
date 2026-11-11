"use client";

import Link from "next/link";
import { whatsappUrl } from "../../../lib/business.mjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiHeart, FiImage, FiMapPin, FiMessageCircle, FiMinus, FiPackage, FiPlus, FiRefreshCw, FiTruck } from "react-icons/fi";
import { FaFacebookF, FaFire, FaStar, FaRegStar, FaTwitter } from "react-icons/fa";
import { useCategories } from "../../hooks/useCategories";
import { useCart } from "../../context/CartContext";
import { useCustomer } from "../../context/CustomerContext";
import ProductCard from "../../components/ProductCard";
import PaymentMethods from "../../components/PaymentMethods";
import { isProductDeliverableToLocation } from "../../../lib/indian-regions.mjs";
import { getCategoryPath } from "../../../lib/category-tree.mjs";
import styles from "./page.module.css";

const money = value => Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProductPage() {
  const categories = useCategories();
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [variantQtys, setVariantQtys] = useState({});
  const [favorite, setFavorite] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [pincode, setPincode] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [purchaseError, setPurchaseError] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const { addItem, products, productsLoading, productsError, showCartAfterAdd } = useCart();
  const { customer } = useCustomer();
  const product = products.find(item => item.slug === slug);

  useEffect(() => {
    setQty(1); setVariantQtys({}); setPurchaseError('');
    setActiveImageIndex(0);
    setShareUrl(window.location.href);
    try { setFavorite(JSON.parse(localStorage.getItem('nursery-wishlist') || '[]').includes(slug)); }
    catch { setFavorite(false); }

    if (customer?.pincode && product) {
      setPincode(customer.pincode);
      const check = isProductDeliverableToLocation(product, customer.pincode);
      if (check.deliverable) {
        setDeliveryMessage(`✓ Available for delivery to your registered location (${customer.pincode}${customer.state ? `, ${customer.state}` : ''})!`);
      } else {
        setDeliveryMessage(`⚠️ Not deliverable to your registered location (${customer.pincode}${customer.state ? `, ${customer.state}` : ''}). ${check.message || ''}`);
      }
    } else {
      setPincode('');
      setDeliveryMessage('');
    }
  }, [slug, customer, product]);

  if (productsLoading) return <main className={styles.message} role="status">Loading product…</main>;
  if (productsError) return <main className={styles.message} role="alert">Unable to load this product. Please refresh to try again.</main>;
  if (!product) return <main className={styles.message}><h1>Product not found</h1><Link href="/">Back to store</Link></main>;

  const category = categories.find(item => item.id === product.categoryId);
  const categoryPath = getCategoryPath(product.categoryId, categories);
  const discount = Number(product.oldPrice) > Number(product.price) ? Math.round((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice) * 100) : 0;
  const variants = Object.entries(product.adeniumOptions || {}).filter(([, price]) => price !== '' && price != null);
  const related = products.filter(item => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 4);
  const rating = product.demoMetrics ? 4.4 : Number(product.rating);
  const reviewCount = product.demoMetrics ? 110 : product.reviews;
  const images = [product.image, product.image2].filter(Boolean);

  const handleTouchStart = e => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = e => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && images.length > 1) {
      if (diff > 0) {
        setActiveImageIndex(current => (current + 1) % images.length);
      } else {
        setActiveImageIndex(current => (current - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
  };
  const highlights = [
    [product.replacementInfo, FiRefreshCw], [product.deliveryInfo, FiTruck],
    [product.supportInfo, FiMessageCircle], [product.packagingInfo, FiPackage],
  ].filter(([text]) => text);

  const toggleFavorite = () => {
    const next = !favorite;
    setFavorite(next);
    try {
      const saved = JSON.parse(localStorage.getItem('nursery-wishlist') || '[]');
      localStorage.setItem('nursery-wishlist', JSON.stringify(next ? [...new Set([...saved, slug])] : saved.filter(item => item !== slug)));
    } catch {}
  };

  const addSelection = () => {
    setPurchaseError('');
    if (!product.inStock) return false;
    if (pincode && /^[1-9][0-9]{5}$/.test(pincode)) {
      const check = isProductDeliverableToLocation(product, pincode);
      if (!check.deliverable) {
        setPurchaseError(check.message || `This product cannot be delivered to ${pincode}.`);
        return false;
      }
    }
    if (variants.length) {
      const selected = Object.entries(variantQtys).filter(([, quantity]) => quantity > 0);
      if (!selected.length) { setPurchaseError('Please select at least one option.'); return false; }
      selected.forEach(([variant, quantity]) => addItem(product.slug, quantity, variant));
    } else addItem(product.slug, qty);
    return true;
  };

  const checkDelivery = event => {
    event.preventDefault();
    if (!product.inStock) { setDeliveryMessage('This product is currently sold out.'); return; }
    const check = isProductDeliverableToLocation(product, pincode);
    if (!check.deliverable) {
      setDeliveryMessage(check.message || `Delivery to pincode ${pincode} is not available for this product.`);
    } else {
      setDeliveryMessage(`✓ Delivery is available to pincode ${pincode}!${product.deliveryNote ? ` ${product.deliveryNote}` : ''}`);
    }
  };

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        {categoryPath.length > 0 ? (
          categoryPath.map(cat => (
            <span key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
              <span>/</span>
            </span>
          ))
        ) : category ? (
          <>
            <Link href={`/category/${category.slug}`}>{category.name}</Link>
            <span>/</span>
          </>
        ) : null}
        <span>{product.title}</span>
      </nav>
      <div className={styles.layout}>
        {images.length > 1 ? (
          <div
            className={styles.carouselContainer}
            role="region"
            aria-label={`${product.title} image gallery`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className={styles.productImage}>
              <img src={images[activeImageIndex]} alt={`${product.title} - photo ${activeImageIndex + 1}`} />
            </div>
            <button
              type="button"
              className={`${styles.carouselBtn} ${styles.prevBtn}`}
              aria-label="Previous image"
              onClick={() => setActiveImageIndex(current => (current - 1 + images.length) % images.length)}
            >
              <FiChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.carouselBtn} ${styles.nextBtn}`}
              aria-label="Next image"
              onClick={() => setActiveImageIndex(current => (current + 1) % images.length)}
            >
              <FiChevronRight aria-hidden="true" />
            </button>
            <div className={styles.carouselDots} role="tablist" aria-label="Image selection">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeImageIndex}
                  aria-label={`Show image ${idx + 1}`}
                  className={`${styles.carouselDot} ${idx === activeImageIndex ? styles.carouselDotActive : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                />
              ))}
            </div>
            {/* Desktop thumbnails selector */}
            <div className={styles.desktopThumbnails} aria-hidden="true">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`${styles.desktopThumbBtn} ${idx === activeImageIndex ? styles.desktopThumbBtnActive : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                  tabIndex={-1}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.productImage}>
            {product.image ? <img src={product.image} alt={product.title} /> : <span><FiImage aria-hidden="true" />No product image</span>}
          </div>
        )}
        <section className={styles.details} aria-labelledby="product-title">
          <div className={styles.titleRow}><h1 id="product-title">{product.title}</h1><button type="button" className={`${styles.favorite} ${favorite ? styles.saved : ''}`} aria-label={favorite ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={favorite} onClick={toggleFavorite}><FiHeart /></button></div>
          {product.soldLast24Hours > 0 && <p className={styles.sold}><FaFire aria-hidden="true" />{product.soldLast24Hours} sold in the last 24 hours</p>}
          <div className={styles.share}><span>Share this:</span><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"><FaFacebookF /></a><a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.title)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter"><FaTwitter /></a></div>
          <div className={styles.rating}>
            {reviewCount > 0 ? <><span className={styles.stars} aria-hidden="true">{[1, 2, 3, 4, 5].map(star => star <= Math.round(rating) ? <FaStar key={star} /> : <FaRegStar key={star} />)}</span><span><strong>{rating.toFixed(1)}</strong> | {reviewCount} reviews</span>{product.demoMetrics && <span className={styles.demo}>Demo</span>}</> : <span className={styles.noReviews}>No reviews yet</span>}
          </div>
          <div className={styles.price}><strong>Rs. {money(product.price)}</strong>{discount > 0 && <><del>Rs. {money(product.oldPrice)}</del><span>{discount}% OFF</span></>}</div>
          {product.demoMetrics && <p className={styles.viewers}><span className={styles.dot} /><span><strong>14</strong> people are viewing this right now</span><span className={styles.demo}>Demo</span></p>}
          {product.shippingScope === 'states' && product.deliveryStates && (
            <div style={{ fontSize: '0.84rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.45rem 0.75rem', borderRadius: '6px', margin: '0.6rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🚚</span> <span><strong>Regional Availability:</strong> Ships to {product.deliveryStates} only.</span>
            </div>
          )}
          {product.shippingScope === 'pincodes' && product.deliveryPincodes && (
            <div style={{ fontSize: '0.84rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.45rem 0.75rem', borderRadius: '6px', margin: '0.6rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📍</span> <span><strong>Select Pincodes Only:</strong> Check below to see if your location is supported.</span>
            </div>
          )}
          <form className={styles.delivery} onSubmit={checkDelivery}>
            <label htmlFor="delivery-pincode"><FiMapPin aria-hidden="true" />Check delivery & availability</label>
            <div><input id="delivery-pincode" placeholder="Enter Pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required title="Enter a valid six-digit Indian pincode" value={pincode} onChange={event => { setPincode(event.target.value.replace(/\D/g, '')); setDeliveryMessage(''); }} /><button type="submit">Check</button></div>
            {deliveryMessage && <p role="status">{deliveryMessage}<a href={whatsappUrl(`Hello, please confirm delivery of ${product.title} to ${pincode}.`)} target="_blank" rel="noopener noreferrer">Contact nursery</a></p>}
          </form>
          {variants.length ? <div className={styles.variants}><h2>Select options</h2>{variants.map(([variant, price]) => <div key={variant}><span>{variant}<small>Rs. {money(price)}</small></span><div className={styles.quantity}><button type="button" aria-label={`Decrease ${variant} quantity`} onClick={() => setVariantQtys(current => ({ ...current, [variant]: Math.max(0, (current[variant] || 0) - 1) }))}><FiMinus /></button><strong>{variantQtys[variant] || 0}</strong><button type="button" aria-label={`Increase ${variant} quantity`} onClick={() => setVariantQtys(current => ({ ...current, [variant]: (current[variant] || 0) + 1 }))}><FiPlus /></button></div></div>)}</div> : <div className={styles.quantityRow}><strong>Qty:</strong><div className={styles.quantity}><button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(current => Math.max(1, current - 1))}><FiMinus /></button><output aria-live="polite">{qty}</output><button type="button" aria-label="Increase quantity" onClick={() => setQty(current => current + 1)}><FiPlus /></button></div></div>}
          {purchaseError && <p role="alert" className={styles.error}>{purchaseError}</p>}
          <div className={styles.buttons}><button type="button" disabled={!product.inStock} onClick={() => { if (addSelection()) showCartAfterAdd(); }}>{product.inStock ? 'Add to Cart' : 'Sold Out'}</button><button type="button" disabled={!product.inStock} onClick={() => { if (addSelection()) router.push('/checkout'); }}>Buy It Now</button></div>
          <PaymentMethods />
          {highlights.length > 0 && <div className={styles.highlights}>{highlights.map(([text, Icon], index) => <div key={index}><Icon aria-hidden="true" /><span>{text}</span></div>)}</div>}
          <div className={styles.accordions}>
            {[['Product Description', product.description], ['Plant Care Tips', product.plantCare], ['Delivery & Returns', product.deliveryReturns]].map(([title, content], index) => <details key={`${product.id}-${title}`} open={index === 0}><summary>{title}<FiChevronDown aria-hidden="true" /></summary><p>{content || 'Information has not been provided yet.'}</p></details>)}
          </div>
        </section>
      </div>
      {related.length > 0 && <section className={styles.related}><h2>You May Also Like</h2><div>{related.map(item => <ProductCard key={item.id} product={item} />)}</div></section>}
    </main>
  );
}
