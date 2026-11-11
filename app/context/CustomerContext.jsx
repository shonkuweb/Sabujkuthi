"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.customer) {
          setCustomer(data.customer);
        } else {
          setCustomer(null);
        }
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (phone, password) => {
    const res = await fetch('/api/customer/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (res.ok && data.success && data.customer) {
      setCustomer(data.customer);
      return { success: true, customer: data.customer };
    }
    return { success: false, message: data.message || 'Login failed' };
  };

  const signup = async (phone, password, name, state, pincode) => {
    const res = await fetch('/api/customer/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, name, state, pincode })
    });
    const data = await res.json();
    if (res.ok && data.success && data.customer) {
      setCustomer(data.customer);
      return { success: true, customer: data.customer };
    }
    return { success: false, message: data.message || 'Signup failed' };
  };

  const logout = async () => {
    try {
      await fetch('/api/customer/auth/logout', { method: 'POST' });
    } finally {
      setCustomer(null);
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isLoading,
        isAuthenticated: !!customer,
        login,
        signup,
        logout,
        refreshCustomer: checkAuth
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
