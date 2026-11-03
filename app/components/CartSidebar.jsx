"use client";

import Link from "next/link";
import { FiX, FiMinus, FiPlus, FiTrash2, FiShoppingBag, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { useCart } from "../context/CartContext";
import { useStoreSettings } from "../context/StoreSettingsContext";

export default function CartSidebar() {
  const { items: cartItems, updateQty, removeItem, isSidebarOpen, setIsSidebarOpen } = useCart();
  const { deliverySettings } = useStoreSettings();

  const toAmount = (value) => {
    const match = String(value).replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const itemCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + toAmount(i.price) * i.qty, 0);
  const threshold = deliverySettings?.freeDeliveryThreshold ?? 3999;
  const progressPercent = threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 100;
  const isFreeDelivery = threshold > 0 && subtotal >= threshold;

  return (
    <>
      {isSidebarOpen && (
        <button
          className="menu-overlay blur-overlay"
          aria-label="Close cart overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside className={`cart-sidebar-modern ${isSidebarOpen ? "open" : ""}`} aria-label="Shopping Cart">
        {/* Cart Header */}
        <div className="cart-sidebar-head">
          <div className="cart-title">
            <div className="cart-title-icon-box">
              <FiShoppingBag className="cart-title-icon" />
            </div>
            <div className="cart-title-text">
              <strong>Your Cart</strong>
              <span className="cart-item-count-pill">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
            </div>
          </div>
          <button
            type="button"
            className="close-btn-modern"
            aria-label="Close cart"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FiX />
          </button>
        </div>

        {/* Free Delivery Bar */}
        {cartItems.length > 0 && threshold > 0 && (
          <div className="cart-delivery-banner">
            <div className="delivery-banner-text">
              {isFreeDelivery ? (
                <span className="free-shipping-unlocked">
                  <FiCheckCircle className="check-icon" /> You have unlocked <strong>FREE Delivery!</strong>
                </span>
              ) : (
                <span>
                  Add <strong>₹{(threshold - subtotal).toFixed(0)}</strong> more for <strong>FREE Delivery</strong>
                </span>
              )}
            </div>
            <div className="delivery-progress-track">
              <div
                className={`delivery-progress-fill ${isFreeDelivery ? 'complete' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart Body / Items */}
        <div className="cart-sidebar-body">
          {cartItems.length === 0 ? (
            <div className="empty-cart-modern">
              <div className="empty-cart-icon-bg">
                <FiShoppingBag className="empty-cart-icon" />
              </div>
              <h3>Your cart is empty</h3>
              <p>Explore our beautiful nursery collection and bring home your favorite plants!</p>
              <Link
                href="/collection"
                className="btn-modern-primary mt-4"
                onClick={() => setIsSidebarOpen(false)}
              >
                Browse Plants <FiArrowRight />
              </Link>
            </div>
          ) : (
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <article className="cart-item-modern" key={`${item.slug}-${item.variant || 'base'}`}>
                  <div
                    className={`cart-item-img ${item.imageClass || ''}`}
                    style={item.image ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  />
                  <div className="cart-item-details">
                    <div className="cart-item-header">
                      <p className="cart-item-title">{item.title}</p>
                      <button
                        type="button"
                        className="cart-item-remove"
                        aria-label={`Remove ${item.title} from cart`}
                        onClick={() => removeItem(item.slug, item.variant)}
                        title="Remove item"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    {item.variant && <span className="cart-item-variant">Variant: {item.variant}</span>}
                    <div className="cart-item-bottom">
                      <strong className="cart-item-price">₹{toAmount(item.price).toLocaleString('en-IN')}</strong>
                      <div className="qty-control-modern" aria-label="Item quantity controls">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQty(item.slug, item.variant, item.qty - 1)}
                        >
                          <FiMinus />
                        </button>
                        <span>{item.qty}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQty(item.slug, item.variant, item.qty + 1)}
                        >
                          <FiPlus />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Cart Sticky Footer - Always Fully Visible on Mobile */}
        {cartItems.length > 0 && (
          <div className="cart-sidebar-footer">
            <div className="cart-subtotal-row">
              <span className="cart-subtotal-label">Subtotal</span>
              <strong className="cart-subtotal-val">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <p className="tax-shipping-note">Taxes and delivery calculated at checkout.</p>
            <Link
              href="/checkout"
              className="btn-modern-primary btn-checkout-action full-width"
              onClick={() => setIsSidebarOpen(false)}
            >
              <span>Proceed to Checkout</span>
              <FiArrowRight className="checkout-arrow" />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
