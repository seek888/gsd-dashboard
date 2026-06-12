"use client";

import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ── Icons & Styles ────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { icon: typeof CheckCircle2; border: string; bg: string; iconColor: string }> = {
  success: { icon: CheckCircle2, border: "border-emerald-500/30", bg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  error: { icon: AlertCircle, border: "border-rose-500/30", bg: "bg-rose-500/10", iconColor: "text-rose-400" },
  warning: { icon: AlertTriangle, border: "border-amber-500/30", bg: "bg-amber-500/10", iconColor: "text-amber-400" },
  info: { icon: Info, border: "border-sky-500/30", bg: "bg-sky-500/10", iconColor: "text-sky-400" },
};

// ── Toast Item ────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const style = TOAST_STYLES[toast.type];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-lg border p-3 shadow-xl backdrop-blur-sm",
        "animate-in slide-in-from-right-full fade-in duration-300",
        style.border,
        style.bg,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs text-slate-400">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-slate-500 hover:text-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const duration = t.duration ?? 4000;
      setToasts((prev) => [...prev, { ...t, id }]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast 容器 */}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
