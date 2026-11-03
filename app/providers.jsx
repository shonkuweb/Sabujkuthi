"use client";

import { CustomerProvider } from "./context/CustomerContext";
import { CartProvider } from "./context/CartContext";
import { StoreSettingsProvider } from "./context/StoreSettingsContext";
import CartSidebar from "./components/CartSidebar";
import StoreShell from "./components/StoreShell";

export function Providers({ children }) {
  return (
    <CustomerProvider>
      <StoreSettingsProvider>
        <CartProvider>
          <StoreShell>{children}</StoreShell>
          <CartSidebar />
        </CartProvider>
      </StoreSettingsProvider>
    </CustomerProvider>
  );
}

