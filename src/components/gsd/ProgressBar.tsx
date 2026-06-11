import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  completed?: number;
  total?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, completed, total, label, className }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-slate-200">{label ?? "总体进度"}</span>
        <span className="font-mono text-sm text-slate-300">
          {safeValue}%
          {typeof completed === "number" && typeof total === "number" && total >= 0
            ? completed >= 0 ? ` · ${completed}/${total}` : ""
            : ""}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-md border border-white/10 bg-slate-950">
        <div
          className="h-full rounded-md bg-[linear-gradient(90deg,#22c55e,#38bdf8)] transition-[width] duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
