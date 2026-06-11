import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, CircleDot, OctagonAlert } from "lucide-react";
import type { PhaseOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";
import { statusLabel, statusTone } from "./status";

interface PhaseCardProps {
  phase: PhaseOverview;
  projectId?: string;
}

export function PhaseCard({ phase, projectId }: PhaseCardProps) {
  const href = `/phases/${phase.number}${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`;

  return (
    <Link
      href={href}
      className="group block rounded-lg border border-white/10 bg-slate-900/70 p-5 transition hover:border-sky-400/40 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Phase {phase.number}</div>
          <h2 className="mt-2 truncate text-lg font-semibold text-white">{phase.title}</h2>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs", statusTone(phase.status))}>
          {statusIcon(phase.status)}
          {statusLabel(phase.status)}
        </span>
      </div>

      {phase.goal ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{phase.goal}</p> : null}

      <ProgressBar
        value={phase.progress}
        completed={phase.completedPlans >= 0 ? phase.completedPlans : undefined}
        total={phase.totalPlans >= 0 ? phase.totalPlans : undefined}
        label="计划完成"
        className="mt-5"
      />

      <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
        <span>
          {phase.totalPlans >= 0 ? `${phase.completedPlans} / ${phase.totalPlans} plans` : "无详细数据"}
        </span>
        <span className="inline-flex items-center gap-1 text-sky-200 transition group-hover:translate-x-0.5">
          查看详情
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function statusIcon(status: PhaseOverview["status"]) {
  if (status === "complete" || status === "completed" || status === "phase_complete") return <CheckCircle2 className="size-3.5" />;
  if (status === "in_progress" || status === "planning" || status === "ready_to_execute") return <CircleDot className="size-3.5" />;
  if (status === "blocked") return <OctagonAlert className="size-3.5" />;
  return <CircleDashed className="size-3.5" />;
}
