import { CheckCircle2, CircleDashed, CircleDot, OctagonAlert } from "lucide-react";
import type { PhaseOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { statusTone } from "./status";

interface PhaseTimelineProps {
  phases: PhaseOverview[];
}

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  if (phases.length === 0) return null;

  const completedCount = phases.filter(
    (p) => p.status === "complete" || p.status === "completed" || p.status === "phase_complete",
  ).length;

  return (
    <section className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium text-slate-200">项目进度</div>
        <div className="text-xs text-slate-500">
          {completedCount}/{phases.length} phases 完成
        </div>
      </div>

      {/* Timeline bar */}
      <div className="mt-3 sm:mt-4 flex items-stretch gap-0.5 sm:gap-1">
        {phases.map((phase, i) => (
          <div key={phase.number} className="group relative flex-1">
            {/* Bar segment */}
            <div
              className={cn(
                "h-6 sm:h-8 rounded-sm transition-colors",
                phaseStatusBg(phase.status),
              )}
              title={`Phase ${phase.number}: ${phase.title} — ${phase.status}`}
            />
            {/* Tooltip on hover - hidden on mobile */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 hidden sm:block whitespace-nowrap rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              <div className="font-medium text-white">{phase.title}</div>
              <div className="mt-1 flex items-center gap-1.5 text-slate-400">
                {statusIcon(phase.status)}
                <span className={statusTone(phase.status)}>{statusText(phase.status)}</span>
                {phase.totalPlans >= 0 && (
                  <span className="ml-1">
                    · {phase.completedPlans}/{phase.totalPlans}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Phase numbers */}
      <div className="mt-1.5 sm:mt-2 flex gap-0.5 sm:gap-1">
        {phases.map((phase) => (
          <div key={phase.number} className="flex-1 text-center">
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-600">{phase.number}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function phaseStatusBg(status: PhaseOverview["status"]): string {
  if (status === "complete" || status === "completed" || status === "phase_complete") {
    return "bg-gradient-to-b from-emerald-500/60 to-emerald-600/40";
  }
  if (status === "in_progress" || status === "planning" || status === "ready_to_execute") {
    return "bg-gradient-to-b from-sky-500/60 to-sky-600/40 animate-pulse";
  }
  if (status === "blocked") {
    return "bg-gradient-to-b from-rose-500/60 to-rose-600/40";
  }
  return "bg-slate-700/40";
}

function statusIcon(status: PhaseOverview["status"]) {
  if (status === "complete" || status === "completed" || status === "phase_complete") return <CheckCircle2 className="size-3" />;
  if (status === "in_progress" || status === "planning" || status === "ready_to_execute") return <CircleDot className="size-3" />;
  if (status === "blocked") return <OctagonAlert className="size-3" />;
  return <CircleDashed className="size-3" />;
}

function statusText(status: PhaseOverview["status"]): string {
  if (status === "complete" || status === "completed" || status === "phase_complete") return "已完成";
  if (status === "in_progress") return "进行中";
  if (status === "planning") return "规划中";
  if (status === "ready_to_execute") return "待执行";
  if (status === "blocked") return "阻塞";
  if (status === "pending") return "待开始";
  return "未知";
}
