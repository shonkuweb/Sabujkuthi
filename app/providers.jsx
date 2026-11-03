"use client";

import { CartProvider } from "./context/CartContext";
import { StoreSettingsProvider } from "./context/StoreSettingsContext";
import CartSidebar from "./components/CartSidebar";
import StoreShell from "./components/StoreShell";

export function Providers({ children }) {
  return (
    <StoreSettingsProvider>
      <CartProvider>
        <StoreShell>{children}</StoreShell>
        <CartSidebar />
      </CartProvider>
    </StoreSettingsProvider>
  );
}
