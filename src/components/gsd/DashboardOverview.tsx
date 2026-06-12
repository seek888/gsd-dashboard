"use client";

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FolderKanban, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react";
import Link from "next/link";
import type { DashboardStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/hooks/use-stream";
import { ActivityFeed } from "./ActivityFeed";
import { BlockerAlertList } from "./BlockerAlertList";
import { CommandPalette } from "./CommandPalette";
import { FileExplorer } from "./FileExplorer";
import { NextStepCard } from "./NextStepCard";
import { PhaseCard } from "./PhaseCard";
import { PhaseTimeline } from "./PhaseTimeline";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";
import { WaveAdvancePrompt } from "./WaveAdvancePrompt";
import { statusLabel, statusTone } from "./status";

interface DashboardOverviewProps {
  initialStatus: DashboardStatus;
}

export function DashboardOverview({ initialStatus }: DashboardOverviewProps) {
  const [status, setStatus] = useState(initialStatus);
  const [lastUpdated, setLastUpdated] = useState(initialStatus.generatedAt);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const activeProjectId = status.activeProject.id;
  const statusUrl = useMemo(() => `/api/status?project=${encodeURIComponent(activeProjectId)}`, [activeProjectId]);

  const doRefresh = useCallback(async () => {
    try {
      const response = await fetch(statusUrl, { cache: "no-store" });
      if (!response.ok) return;
      const nextStatus = (await response.json()) as DashboardStatus;
      setStatus(nextStatus);
      setLastUpdated(nextStatus.generatedAt);
    } catch { /* ignore */ }
  }, [statusUrl]);

  // Auto-refresh: SSE + polling fallback
  const { streamState } = useAutoRefresh({
    projectId: activeProjectId,
    intervalMs: 30000,
    enabled: true,
    onRefresh: doRefresh,
  });

  function selectProject(projectId: string) {
    const project = status.projects.find((item) => item.id === projectId);
    if (!project) return;

    startTransition(() => {
      router.push(`/?project=${encodeURIComponent(project.id)}`);
    });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <FolderKanban className="size-4 text-sky-300" />
            <span>{status.source === "cli" ? "GSD CLI" : "Markdown fallback"}</span>
            <span className={cn("rounded-md border px-2 py-0.5 text-xs", statusTone(status.state.status))}>{statusLabel(status.state.status)}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">{status.project.name}</h1>
          <div className="mt-2">
            <CommandPalette projectId={activeProjectId} />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{status.project.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-400" htmlFor="project-switcher">
            项目
          </label>
          <select
            id="project-switcher"
            value={activeProjectId}
            onChange={(event) => selectProject(event.target.value)}
            className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
          >
            {status.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            {streamState.connected ? (
              <Wifi className="size-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="size-3.5 text-slate-600" />
            )}
            <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
            {formatTime(lastUpdated)}
          </div>
        </div>
      </div>

      {/* Next Step Card */}
      <div className="mt-4">
        <NextStepCard status={status} onExecuted={doRefresh} />
      </div>

      {/* Wave Advance Prompt */}
      <div className="mt-3">
        <WaveAdvancePrompt status={status} onAdvanced={doRefresh} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 py-4">
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-500">Phase 总数</div>
          <div className="mt-1 text-2xl font-semibold text-white">{status.phases.length}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-500">完成进度</div>
          <div className="mt-1 text-2xl font-semibold text-white">{status.progress.percent}%</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-500">阻塞项</div>
          <div className="mt-1 text-2xl font-semibold text-white">{status.blockers.length}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <div className="text-xs text-slate-500">总计划</div>
          <div className="mt-1 text-2xl font-semibold text-white">{status.progress.totalPlans >= 0 ? `${status.progress.completedPlans}/${status.progress.totalPlans}` : "—"}</div>
        </div>
      </div>

      <section className="grid gap-6 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <PhaseTimeline phases={status.phases} />

          {/* Execute Page Link */}
          <Link
            href={`/execute?project=${encodeURIComponent(status.activeProject.id)}`}
            className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-2.5 text-sm text-sky-400 transition hover:bg-sky-500/10"
          >
            <Zap className="size-4" />
            <span>执行监控</span>
            <span className="ml-auto text-[10px] text-slate-500">实时日志 + 命令队列</span>
          </Link>

          <div className="flex flex-col items-center gap-4 rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:p-5">
            <ProgressRing
              value={status.progress.percent}
              size={80}
              strokeWidth={6}
            />
            <div className="min-w-0 flex-1 w-full">
              <ProgressBar
                value={status.progress.percent}
                completed={status.progress.completedPlans}
                total={status.progress.totalPlans}
                label={status.progress.label ?? "总体完成度"}
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Phase 列表</h2>
              <span className="text-sm text-slate-500">{status.phases.length} phases</span>
            </div>
            {status.phases.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {status.phases.map((phase) => (
                  <PhaseCard key={phase.number} phase={phase} projectId={activeProjectId} />
                ))}
              </div>
            ) : (
              <EmptyState title="未发现 Phase" description="请确认目标项目存在 .planning/phases 目录或 ROADMAP.md。" />
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">阻塞项</h2>
            {status.blockers.length > 0 ? (
              <div className="space-y-3">
                {status.blockers.map((blocker) => (
                  <div key={blocker} className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                    <div className="flex gap-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>{blocker}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">当前没有记录的阻塞项。</div>
            )}
          </section>

          <section>
            <FileExplorer projectName={activeProjectId} className="mb-6" />
            <h2 className="mb-4 text-lg font-semibold text-white">最近活动</h2>
            <ActivityFeed activities={status.activities} />
          </section>
        </aside>
      </section>
    </main>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/60 p-8 text-center">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "等待刷新";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
