"use client";

import { cn } from "@/lib/utils";

interface ContextMeterProps {
  /** Used context (e.g., 156000) */
  used: number;
  /** Total context window (e.g., 200000) */
  total: number;
  /** Label for the meter */
  label?: string;
  /** Size variant */
  size?: "sm" | "md";
}

export function ContextMeter({ used, total, label = "上下文", size = "md" }: ContextMeterProps) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const level = pct >= 90 ? "critical" : pct >= 70 ? "warning" : "ok";
  const colors = {
    ok: "bg-emerald-500 text-emerald-400",
    warning: "bg-amber-500 text-amber-400",
    critical: "bg-rose-500 text-rose-400",
  };
  const barColors = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    critical: "bg-rose-500",
  };

  const isSm = size === "sm";

  return (
    <div className={cn("space-y-1", isSm ? "w-40" : "w-56")}>
      <div className="flex items-center justify-between">
        <span className={cn("text-slate-400", isSm ? "text-[10px]" : "text-xs")}>{label}</span>
        <span className={cn("font-mono", colors[level].split(" ")[1], isSm ? "text-[10px]" : "text-xs")}>
          {formatK(used)}/{formatK(total)}
        </span>
      </div>
      <div className={cn("overflow-hidden rounded-full bg-slate-800", isSm ? "h-1" : "h-1.5")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColors[level])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {level !== "ok" && (
        <div className={cn("flex items-center gap-1", isSm ? "text-[9px]" : "text-[10px]", level === "critical" ? "text-rose-400" : "text-amber-400")}>
          {level === "critical" ? "⚠️ CRITICAL" : "⚠️ DEGRADING"}
        </div>
      )}
    </div>
  );
}

function formatK(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}
