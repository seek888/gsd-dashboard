"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, BookOpenText, RefreshCw, Terminal, Loader2, CheckCircle2, AlertCircle, Activity, Clock } from "lucide-react";
import type { PhaseDetail, ActivityItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PlanCard } from "./PlanCard";
import { ProgressBar } from "./ProgressBar";
import { statusLabel, statusTone } from "./status";
import { WaveDiagram } from "./WaveDiagram";
import { GSD_COMMANDS, type GsdCommandId } from "@/lib/command-types";

interface PhaseDetailViewProps {
  initialPhase: PhaseDetail;
  projectId?: string;
}

export function PhaseDetailView({ initialPhase, projectId }: PhaseDetailViewProps) {
  const [phase, setPhase] = useState(initialPhase);
  const [activeDoc, setActiveDoc] = useState(initialPhase.documents[0]?.path ?? "");
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const phaseUrl = useMemo(() => {
    const suffix = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
    return `/api/phases/${initialPhase.number}${suffix}`;
  }, [initialPhase.number, projectId]);
  const homeHref = `/${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`;
  const activeDocument = phase.documents.find((doc) => doc.path === activeDoc) ?? phase.documents[0];
  const refreshPhase = useCallback(async () => {
    const response = await fetch(phaseUrl, { cache: "no-store" });
    if (!response.ok) return;
    const nextPhase = (await response.json()) as PhaseDetail;
    setPhase(nextPhase);
    setLastUpdated(new Date().toISOString());
  }, [phaseUrl]);
  const phaseExecuteLabel = phase.status === "in_progress" ? "继续执行" : "开始执行";

  useEffect(() => {
    let disposed = false;

    async function refresh() {
      const response = await fetch(phaseUrl, { cache: "no-store" });
      if (!response.ok) return;
      const nextPhase = (await response.json()) as PhaseDetail;
      if (!disposed) {
        setPhase(nextPhase);
        setLastUpdated(new Date().toISOString());
      }
    }

    const interval = window.setInterval(refresh, 5000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [phaseUrl]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <Link href={homeHref} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-sky-200">
          <ArrowLeft className="size-4" />
          返回总览
        </Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-slate-500">Phase {phase.number}</span>
              <span className={cn("rounded-md border px-2 py-0.5 text-xs", statusTone(phase.status))}>{statusLabel(phase.status)}</span>
            </div>
            <h1 className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold text-white">{phase.title}</h1>
            {phase.goal ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{phase.goal}</p> : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PhaseActionButton
              projectId={projectId}
              phaseNumber={phase.number}
              commandId="execute-phase"
              label={phaseExecuteLabel}
              extraArgs={[String(phase.number)]}
              onDone={refreshPhase}
            />
            <PhaseActionButton
              projectId={projectId}
              phaseNumber={phase.number}
              commandId="verify-work"
              label="验证工作"
              onDone={refreshPhase}
            />
            <PhaseActionButton
              projectId={projectId}
              phaseNumber={phase.number}
              commandId="health"
              label="健康检查"
              onDone={refreshPhase}
            />
            <PhaseActionButton
              projectId={projectId}
              phaseNumber={phase.number}
              commandId="list-todos"
              label="查看待办"
            />
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="size-3.5" />
            {formatTime(lastUpdated)}
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:gap-6 py-4 sm:py-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-5">
            <ProgressBar value={phase.progress} completed={phase.completedPlans} total={phase.totalPlans} label="Phase 计划完成度" />
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">Wave 依赖图</h2>
            <WaveDiagram waves={phase.waves} />
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Activity className="size-5 text-emerald-400" />
              Phase 活动
            </h2>
            <PhaseActivities phaseNumber={phase.number} projectId={projectId} />
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">Plan 列表</h2>
            {phase.waves.length > 0 ? (
              <div className="space-y-5">
                {phase.waves.map((wave) => (
                  <div key={wave.wave}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">Wave {wave.wave}</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="grid gap-3">
                      {wave.plans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-5 text-sm text-slate-400">暂无 Plan 文件。</div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpenText className="size-4 text-sky-300" />
            <h2 className="text-lg font-semibold text-white">Phase 文档</h2>
          </div>
          {phase.documents.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {phase.documents.map((doc) => (
                  <button
                    key={doc.path}
                    type="button"
                    onClick={() => setActiveDoc(doc.path)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition",
                      activeDocument?.path === doc.path
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-100"
                        : "border-white/10 bg-slate-900 text-slate-400 hover:text-slate-100",
                    )}
                  >
                    {docLabel(doc.kind)}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-5">
                <MarkdownRenderer content={activeDocument?.content ?? ""} />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-5 text-sm text-slate-400">
              未找到 CONTEXT / RESEARCH / UAT 文档。
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function docLabel(kind: string): string {
  if (kind === "context") return "CONTEXT";
  if (kind === "research") return "RESEARCH";
  if (kind === "uat") return "UAT";
  return "DOC";
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

// ── Phase Activities ──────────────────────────────────────────

function PhaseActivities({ phaseNumber, projectId }: { phaseNumber: number; projectId?: string }) {
  const [activities, setActivities] = useState<{ items: ActivityItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const suffix = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
        const res = await fetch(`/api/status${suffix}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const phaseActivities = (data.activities || []).filter(
          (a: ActivityItem) => a.phaseNumber === phaseNumber
        );
        if (!disposed) setActivities({ items: phaseActivities });
      } catch {
        // ignore
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    load();
  }, [phaseNumber, projectId]);

  if (loading) {
    return <div className="py-4 text-center text-sm text-slate-500">加载中...</div>;
  }

  if (!activities || activities.items.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-5 text-center">
        <Activity className="mx-auto size-8 text-slate-700" />
        <p className="mt-2 text-sm text-slate-500">该 Phase 暂无活动记录</p>
        <p className="mt-1 text-xs text-slate-600">执行 Plan 后活动会自动记录</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
      {activities.items.map((item, i) => (
        <div key={item.id || i} className="relative flex gap-3 px-2 py-2.5">
          {/* Timeline dot */}
          <div className={cn(
            "z-10 mt-1.5 size-[9px] shrink-0 rounded-full border-2",
            item.status === "complete" ? "border-emerald-400 bg-emerald-400" :
            item.status === "in_progress" ? "border-sky-400 bg-sky-400" :
            "border-slate-600 bg-slate-600"
          )} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white">{item.title}</span>
              <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px]", statusTone(item.status))}>
                {statusLabel(item.status)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {item.timestamp && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatTime(item.timestamp)}
                </span>
              )}
              {item.planNumber > 0 && (
                <span>Plan {item.planNumber}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Phase Action Button ────────────────────────────────────────

function PhaseActionButton({
  projectId,
  commandId,
  label,
  extraArgs = [],
  onDone,
}: {
  projectId?: string;
  phaseNumber: number;
  commandId: GsdCommandId;
  label: string;
  extraArgs?: string[];
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean } | null>(null);

  const handleClick = useCallback(async () => {
    if (!projectId || loading) return;
    const command = GSD_COMMANDS.find((item) => item.id === commandId);
    if (!command) return;
    if (command.isWrite && !window.confirm(`确认执行写操作「${command.label}」？`)) return;

    setLoading(true);
    setResult(null);
    try {
      const res = command.isWrite
        ? await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "start",
              command: commandId,
              projectId,
              args: extraArgs,
              confirmed: true,
            }),
          })
        : await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commandId, projectId, extraArgs }),
          });
      const data = await res.json();
      setResult({ success: res.ok && (command.isWrite ? Boolean(data.execution) : Boolean(data.success)) });
      onDone?.();
    } catch {
      setResult({ success: false });
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  }, [projectId, commandId, extraArgs, loading, onDone]);

  return (
    <button
      onClick={handleClick}
      disabled={loading || !projectId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        result?.success
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : result?.success === false
            ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
            : "border-white/10 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white",
      )}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : result?.success ? (
        <CheckCircle2 className="size-3.5" />
      ) : result?.success === false ? (
        <AlertCircle className="size-3.5" />
      ) : (
        <Terminal className="size-3.5" />
      )}
      {label}
    </button>
  );
}
