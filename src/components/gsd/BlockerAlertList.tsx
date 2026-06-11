"use client";

import { AlertTriangle, AlertCircle, Info, X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockerAlert } from "@/lib/blocker-detector";

interface BlockerAlertListProps {
  alerts: BlockerAlert[];
  onDismiss?: (id: string) => void;
}

export function BlockerAlertList({ alerts, onDismiss }: BlockerAlertListProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <BlockerAlertCard key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function BlockerAlertCard({ alert, onDismiss }: { alert: BlockerAlert; onDismiss?: (id: string) => void }) {
  const config = {
    info: { icon: Info, border: "border-sky-500/20", bg: "bg-sky-500/5", text: "text-sky-400" },
    warning: { icon: AlertTriangle, border: "border-amber-500/20", bg: "bg-amber-500/5", text: "text-amber-400" },
    critical: { icon: AlertCircle, border: "border-rose-500/20", bg: "bg-rose-500/5", text: "text-rose-400" },
  }[alert.severity];

  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-3", config.border, config.bg)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 size-4 shrink-0", config.text)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", config.text)}>
              {alert.severity === "critical" ? "严重" : alert.severity === "warning" ? "警告" : "提示"}
            </span>
            {alert.phase && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                Phase {alert.phase}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-300">{alert.message}</p>
          {alert.suggestion && (
            <div className="mt-1.5 flex items-start gap-1 text-[10px] text-slate-500">
              <Lightbulb className="mt-px size-3 shrink-0" />
              <span>{alert.suggestion}</span>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="shrink-0 rounded p-0.5 text-slate-600 hover:bg-white/5 hover:text-slate-400"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
