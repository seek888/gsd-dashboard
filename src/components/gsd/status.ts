import type { GsdStatus } from "@/lib/types";

export function statusLabel(status: GsdStatus): string {
  const labels: Record<GsdStatus, string> = {
    complete: "完成",
    completed: "完成",
    in_progress: "进行中",
    ready_to_plan: "待规划",
    planning: "规划中",
    ready_to_execute: "待执行",
    phase_complete: "阶段完成",
    blocked: "阻塞",
    pending: "等待",
    unknown: "未知",
  };

  return labels[status] ?? "未知";
}

export function statusTone(status: GsdStatus): string {
  if (status === "complete" || status === "completed" || status === "phase_complete") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (status === "in_progress" || status === "planning" || status === "ready_to_execute") {
    return "border-sky-400/25 bg-sky-400/10 text-sky-200";
  }
  if (status === "blocked") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

export function statusDot(status: GsdStatus): string {
  if (status === "complete" || status === "completed" || status === "phase_complete") return "bg-emerald-400";
  if (status === "in_progress" || status === "planning" || status === "ready_to_execute") return "bg-sky-400";
  if (status === "blocked") return "bg-rose-400";
  return "bg-slate-500";
}
