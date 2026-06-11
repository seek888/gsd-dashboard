"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface FileChangeEvent {
  type: "file-change";
  event: string;
  path: string;
  timestamp: number;
}

type SSEEvent = FileChangeEvent | { type: "connected"; timestamp: number };

interface UseStreamOptions {
  projectId: string | undefined;
  onFileChange?: (event: FileChangeEvent) => void;
  /** Polling fallback interval in ms (default: 30000) */
  fallbackInterval?: number;
  /** Whether to enable streaming (default: true) */
  enabled?: boolean;
}

interface StreamState {
  connected: boolean;
  lastEvent: SSEEvent | null;
  eventCount: number;
}

export function useStream({ projectId, onFileChange, fallbackInterval = 30000, enabled = true }: UseStreamOptions): StreamState {
  const [state, setState] = useState<StreamState>({
    connected: false,
    lastEvent: null,
    eventCount: 0,
  });
  const onFileChangeRef = useRef(onFileChange);
  useEffect(() => {
    onFileChangeRef.current = onFileChange;
  });

  // SSE connection
  useEffect(() => {
    if (!projectId || !enabled) return;

    const abortController = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const url = `/api/stream?project=${projectId}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setState((prev) => ({ ...prev, connected: true }));
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as SSEEvent;
          setState((prev) => ({
            connected: true,
            lastEvent: data,
            eventCount: prev.eventCount + 1,
          }));
          if (data.type === "file-change" && onFileChangeRef.current) {
            onFileChangeRef.current(data);
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setState((prev) => ({ ...prev, connected: false }));
        // Reconnect after delay
        reconnectTimer = setTimeout(connect, 5000);
      };

      return () => {
        eventSource.close();
        clearTimeout(reconnectTimer);
      };
    }

    const cleanup = connect();

    return () => {
      cleanup?.();
      abortController.abort();
    };
  }, [projectId, enabled]);

  return state;
}

// ── Auto-refresh hook ─────────────────────────────────────────

interface UseAutoRefreshOptions {
  projectId: string | undefined;
  intervalMs?: number;
  enabled?: boolean;
  onRefresh?: () => void;
}

export function useAutoRefresh({ projectId, intervalMs = 30000, enabled = true, onRefresh }: UseAutoRefreshOptions) {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  const triggerRefresh = useCallback(() => {
    onRefreshRef.current?.();
  }, []);

  // SSE-driven refresh
  const onFileChange = useCallback(() => {
    triggerRefresh();
  }, [triggerRefresh]);

  const streamState = useStream({
    projectId,
    onFileChange,
    enabled,
  });

  // Fallback polling
  useEffect(() => {
    if (!projectId || !enabled || streamState.connected) return;

    const timer = setInterval(triggerRefresh, intervalMs);
    return () => clearInterval(timer);
  }, [projectId, enabled, intervalMs, streamState.connected, triggerRefresh]);

  return { streamState, triggerRefresh };
}
