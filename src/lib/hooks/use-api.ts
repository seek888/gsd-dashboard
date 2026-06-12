"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface UseApiOptions {
  /** 自动请求（默认 true） */
  auto?: boolean;
  /** 缓存策略 */
  cache?: "no-store" | "default";
}

// ── Hook ──────────────────────────────────────────────────────

export function useApi<T>(url: string | null, options: UseApiOptions = {}) {
  const { auto = true, cache = "no-store" } = options;
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: auto && !!url,
  });

  const execute = useCallback(async () => {
    if (!url) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(url, { cache });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as T;
      setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, error: message, loading: false }));
      return null;
    }
  }, [url, cache]);

  useEffect(() => {
    if (auto && url) {
      execute();
    }
  }, [auto, url, execute]);

  return { ...state, refetch: execute };
}
