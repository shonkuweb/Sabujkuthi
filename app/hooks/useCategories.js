"use client";

import { useEffect, useState } from "react";

export function useCategoryCatalog() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let controller;
    const refresh = async () => {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const response = await fetch('/api/categories', { cache: 'no-store', signal: requestController.signal });
        if (!response.ok) throw new Error('Unable to load categories');
        const data = await response.json();
        if (active && Array.isArray(data)) { setCategories(data); setError(false); }
      } catch (error) {
        if (active && error.name !== 'AbortError') setError(true);
      } finally { if (active && !requestController.signal.aborted) setLoading(false); }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('store-categories') : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      active = false;
      controller?.abort();
      channel?.close();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { categories, loading, error };
}

export function useCategories() { return useCategoryCatalog().categories; }
