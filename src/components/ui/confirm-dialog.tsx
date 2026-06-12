"use client";

import { useState, useCallback, type ReactNode } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  description?: string;
  /** 将影响的文件列表 */
  affectedFiles?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** 危险操作需要输入确认文字 */
  dangerConfirmText?: string;
  variant?: "default" | "danger";
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

// ── Dialog Component ──────────────────────────────────────────

export function ConfirmDialog({
  open,
  title,
  description,
  affectedFiles,
  confirmLabel = "确认执行",
  cancelLabel = "取消",
  dangerConfirmText,
  variant = "default",
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");

  if (!open) return null;

  const canConfirm = dangerConfirmText ? confirmInput === dangerConfirmText : true;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {description && (
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 rounded p-1 text-slate-500 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Affected files */}
        {affectedFiles && affectedFiles.length > 0 && (
          <div className="mt-4 rounded-lg border border-white/5 bg-slate-950/50 p-3">
            <div className="mb-2 text-xs font-medium text-slate-500">将影响的文件：</div>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {affectedFiles.map((file, i) => (
                <div key={i} className="truncate font-mono text-xs text-slate-400">
                  {file}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger confirm text */}
        {dangerConfirmText && (
          <div className="mt-4">
            <label className="block text-xs text-slate-400">
              请输入 <span className="font-mono text-amber-400">{dangerConfirmText}</span> 以确认
            </label>
            <input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              placeholder={dangerConfirmText}
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              variant === "danger"
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30",
            )}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── useConfirmDialog Hook ─────────────────────────────────────

interface UseConfirmDialogReturn {
  showDialog: (options: ConfirmOptions) => Promise<boolean>;
  ConfirmDialogSlot: () => ReactNode;
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
    loading: boolean;
  }>({ open: false, options: null, resolve: null, loading: false });

  const showDialog = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve, loading: false });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!state.resolve) return;
    setState((prev) => ({ ...prev, loading: true }));
    state.resolve(true);
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ open: false, options: null, resolve: null, loading: false });
  }, [state.resolve]);

  const ConfirmDialogSlot = () => {
    if (!state.options) return null;
    return (
      <ConfirmDialog
        open={state.open}
        {...state.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={state.loading}
      />
    );
  };

  return { showDialog, ConfirmDialogSlot };
}
