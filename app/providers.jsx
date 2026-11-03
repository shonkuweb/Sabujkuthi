"use client";

import { CartProvider } from "./context/CartContext";
import CartSidebar from "./components/CartSidebar";
import StoreShell from "./components/StoreShell";

export function Providers({ children }) {
  return (
    <CartProvider>
      <StoreShell>{children}</StoreShell>
      <CartSidebar />
    </CartProvider>
  );
}
