"use client";

import Link from "next/link";
import { FiX, FiMinus, FiPlus, FiTrash2, FiShoppingBag, FiArrowRight } from "react-icons/fi";
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

  return (
    <>
      {isSidebarOpen && <button className="menu-overlay blur-overlay" aria-label="Close cart overlay" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`cart-sidebar-modern ${isSidebarOpen ? "open" : ""}`} aria-label="Cart sidebar">
        <div className="cart-sidebar-head">
          <div className="cart-title">
            <FiShoppingBag className="cart-title-icon" />
            <strong>Your Cart <span className="cart-count">{itemCount}</span></strong>
          </div>
          <button className="close-btn-modern" aria-label="Close cart" onClick={() => setIsSidebarOpen(false)}>
            <FiX />
          </button>
        </div>
        
        <div className="cart-sidebar-body">
          {cartItems.length === 0 ? (
            <div className="empty-cart-modern">
              <div className="empty-cart-icon-bg">
                <FiShoppingBag className="empty-cart-icon" />
              </div>
              <h3>Your cart is empty</h3>
              <p>Looks like you haven't added any plants yet.</p>
              <button className="btn-modern-primary mt-4" onClick={() => setIsSidebarOpen(false)}>
                Start Shopping <FiArrowRight />
              </button>
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
                      <button type="button" className="cart-item-remove" aria-label="Remove item" onClick={() => removeItem(item.slug, item.variant)}>
                        <FiTrash2 />
                      </button>
                    </div>
                    {item.variant && <p className="cart-item-variant">Variant: {item.variant}</p>}
                    <div className="cart-item-bottom">
                      <strong className="cart-item-price">{item.price}</strong>
                      <div className="qty-control-modern">
                        <button type="button" aria-label="Decrease quantity" onClick={() => updateQty(item.slug, item.variant, item.qty - 1)}>
                          <FiMinus />
                        </button>
                        <span>{item.qty}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => updateQty(item.slug, item.variant, item.qty + 1)}>
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

        {cartItems.length > 0 && (
          <div className="cart-sidebar-footer">
            <div className="cart-subtotal-row">
              <span>Subtotal</span>
              <strong>Rs. {subtotal.toFixed(2)}</strong>
            </div>
            {threshold > 0 && (
              <p className="tax-shipping-note" style={{ color: subtotal >= threshold ? '#2d7a46' : '#6b7c70', fontWeight: subtotal >= threshold ? 600 : 400 }}>
                {subtotal >= threshold
                  ? '🎉 You have unlocked FREE delivery!'
                  : `Add ₹${(threshold - subtotal).toFixed(2)} more for FREE delivery!`}
              </p>
            )}
            <p className="tax-shipping-note">Taxes and delivery calculated at checkout.</p>
            <Link href="/checkout" className="btn-modern-primary full-width mt-4" onClick={() => setIsSidebarOpen(false)}>
              Proceed to Checkout <FiArrowRight />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
