"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2, RefreshCw, Terminal, Loader2, AlertCircle, Activity, Clock, BookOpenText, LayoutList, ActivitySquare } from "lucide-react";
import Link from "next/link";
import type { PhaseDetail, ActivityItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PlanCard } from "./PlanCard";
import { ProgressBar } from "./ProgressBar";
import { statusLabel, statusTone } from "./status";
import { WaveDiagram } from "./WaveDiagram";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { GSD_COMMANDS, type GsdCommandId } from "@/lib/command-types";

// ── Tab Types ─────────────────────────────────────────────────

type PhaseTab = "overview" | "plans" | "docs" | "activity";

const TABS: { id: PhaseTab; label: string; icon: typeof LayoutList }[] = [
  { id: "overview", label: "概览", icon: ActivitySquare },
  { id: "plans", label: "Plans", icon: LayoutList },
  { id: "docs", label: "文档", icon: BookOpenText },
  { id: "activity", label: "活动", icon: Activity },
];

// ── Main Component ────────────────────────────────────────────

interface PhaseDetailViewProps {
  initialPhase: PhaseDetail;
  projectId?: string;
}

export function PhaseDetailView({ initialPhase, projectId }: PhaseDetailViewProps) {
  const [phase, setPhase] = useState(initialPhase);
  const [activeDoc, setActiveDoc] = useState(initialPhase.documents[0]?.path ?? "");
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [activeTab, setActiveTab] = useState<PhaseTab>("overview");

  const phaseUrl = `/api/phases/${initialPhase.number}${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`;
  const homeHref = `/${projectId ? `?project=${encodeURIComponent(projectId)}` : ""}`;
  const activeDocument = phase.documents.find((doc) => doc.path === activeDoc) ?? phase.documents[0];

  const refreshPhase = useCallback(async () => {
    try {
      const response = await fetch(phaseUrl, { cache: "no-store" });
      if (!response.ok) return;
      const nextPhase = (await response.json()) as PhaseDetail;
      setPhase(nextPhase);
      setLastUpdated(new Date().toISOString());
    } catch { /* ignore */ }
  }, [phaseUrl]);

  // 自动轮询刷新
  useEffect(() => {
    let disposed = false;
    const interval = window.setInterval(async () => {
      const response = await fetch(phaseUrl, { cache: "no-store" });
      if (!response.ok || disposed) return;
      const nextPhase = (await response.json()) as PhaseDetail;
      if (!disposed) {
        setPhase(nextPhase);
        setLastUpdated(new Date().toISOString());
      }
    }, 5000);
    return () => { disposed = true; clearInterval(interval); };
  }, [phaseUrl]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">

      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <Link href={homeHref} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-sky-200">
          <ArrowLeft className="size-4" />
          返回总览
        </Link>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-slate-500">Phase {phase.number}</span>
              <span className={cn("rounded-md border px-2 py-0.5 text-xs", statusTone(phase.status))}>{statusLabel(phase.status)}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white">{phase.title}</h1>
            {phase.goal && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{phase.goal}</p>}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="size-3.5" />
            {formatTime(lastUpdated)}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-4 flex gap-1 border-b border-white/10">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors",
                activeTab === tab.id
                  ? "border-sky-400 text-sky-300"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === "overview" && (
          <OverviewTab
            phase={phase}
            projectId={projectId}
            onDone={refreshPhase}
          />
        )}
        {activeTab === "plans" && (
          <PlansTab phase={phase} />
        )}
        {activeTab === "docs" && (
          <DocsTab
            phase={phase}
            activeDocument={activeDocument}
            onDocChange={setActiveDoc}
          />
        )}
        {activeTab === "activity" && (
          <ActivityTab phaseNumber={phase.number} projectId={projectId} />
        )}
      </div>
    </main>
  );
}

// ── Overview Tab ──────────────────────────────────────────────

function OverviewTab({ phase, projectId, onDone }: {
  phase: PhaseDetail;
  projectId?: string;
  onDone: () => void;
}) {
  const phaseExecuteLabel = phase.status === "in_progress" ? "继续执行" : "开始执行";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-5">
        <ProgressBar value={phase.progress} completed={phase.completedPlans} total={phase.totalPlans} label="Phase 计划完成度" />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Wave 依赖图</h2>
        <WaveDiagram waves={phase.waves} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <PhaseActionButton projectId={projectId} phaseNumber={phase.number} commandId="execute-phase" label={phaseExecuteLabel} extraArgs={[String(phase.number)]} onDone={onDone} />
        <PhaseActionButton projectId={projectId} phaseNumber={phase.number} commandId="verify-work" label="验证工作" onDone={onDone} />
        <PhaseActionButton projectId={projectId} phaseNumber={phase.number} commandId="health" label="健康检查" onDone={onDone} />
        <PhaseActionButton projectId={projectId} phaseNumber={phase.number} commandId="list-todos" label="查看待办" />
      </div>
    </div>
  );
}

// ── Plans Tab ─────────────────────────────────────────────────

function PlansTab({ phase }: { phase: PhaseDetail }) {
  return (
    <div>
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
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">暂无 Plan 文件。</div>
      )}
    </div>
  );
}

// ── Docs Tab ──────────────────────────────────────────────────

function DocsTab({ phase, activeDocument, onDocChange }: {
  phase: PhaseDetail;
  activeDocument: PhaseDetail["documents"][0] | undefined;
  onDocChange: (path: string) => void;
}) {
  return (
    <div>
      {phase.documents.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {phase.documents.map((doc) => (
              <button
                key={doc.path}
                type="button"
                onClick={() => onDocChange(doc.path)}
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
        <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">
          未找到 CONTEXT / RESEARCH / UAT 文档。
        </div>
      )}
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────

function ActivityTab({ phaseNumber, projectId }: { phaseNumber: number; projectId?: string }) {
  return <PhaseActivities phaseNumber={phaseNumber} projectId={projectId} />;
}

// ── Helpers ───────────────────────────────────────────────────

function docLabel(kind: string): string {
  if (kind === "context") return "CONTEXT";
  if (kind === "research") return "RESEARCH";
  if (kind === "uat") return "UAT";
  return "DOC";
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "等待刷新";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
}

// ── Phase Activities ──────────────────────────────────────────

function PhaseActivities({ phaseNumber, projectId }: { phaseNumber: number; projectId?: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const suffix = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
        const res = await fetch(`/api/status${suffix}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!disposed) {
          setActivities((data.activities || []).filter((a: ActivityItem) => a.phaseNumber === phaseNumber));
        }
      } catch { /* ignore */ } finally {
        if (!disposed) setLoading(false);
      }
    }
    load();
    return () => { disposed = true; };
  }, [phaseNumber, projectId]);

  if (loading) {
    return <div className="py-4 text-center text-sm text-slate-500">加载中...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-center">
        <Activity className="mx-auto size-8 text-slate-700" />
        <p className="mt-2 text-sm text-slate-500">该 Phase 暂无活动记录</p>
        <p className="mt-1 text-xs text-slate-600">执行 Plan 后活动会自动记录</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
      {activities.map((item, i) => (
        <div key={item.id || i} className="relative flex gap-3 px-2 py-2.5">
          <div className={cn(
            "z-10 mt-1.5 size-[9px] shrink-0 rounded-full border-2",
            item.status === "complete" ? "border-emerald-400 bg-emerald-400" :
            item.status === "in_progress" ? "border-sky-400 bg-sky-400" :
            "border-slate-600 bg-slate-600",
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
                <span className="flex items-center gap-1"><Clock className="size-3" />{formatTime(item.timestamp)}</span>
              )}
              {item.planNumber > 0 && <span>Plan {item.planNumber}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Phase Action Button (with ConfirmDialog) ──────────────────

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
  const { showDialog, ConfirmDialogSlot } = useConfirmDialog();
  const { toast } = useToast();

  const handleClick = useCallback(async () => {
    if (!projectId || loading) return;
    const command = GSD_COMMANDS.find((item) => item.id === commandId);
    if (!command) return;

    // 写操作使用自定义确认弹窗
    if (command.isWrite) {
      const confirmed = await showDialog({
        title: `确认执行: ${command.label}`,
        description: command.description,
        confirmLabel: "确认执行",
        variant: "default",
      });
      if (!confirmed) return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = command.isWrite
        ? await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start", command: commandId, projectId, args: extraArgs, confirmed: true }),
          })
        : await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commandId, projectId, extraArgs }),
          });
      const data = await res.json();
      const success = res.ok && (command.isWrite ? Boolean(data.execution) : Boolean(data.success));
      setResult({ success });
      if (success) {
        toast({ type: "success", title: `${label} 已提交` });
      } else {
        toast({ type: "error", title: `${label} 失败`, description: data.error || "未知错误" });
      }
      onDone?.();
    } catch {
      setResult({ success: false });
      toast({ type: "error", title: `${label} 请求失败` });
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  }, [projectId, commandId, extraArgs, loading, onDone, showDialog, toast, label]);

  return (
    <>
      {ConfirmDialogSlot()}
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
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : result?.success ? <CheckCircle2 className="size-3.5" /> : result?.success === false ? <AlertCircle className="size-3.5" /> : <Terminal className="size-3.5" />}
        {label}
      </button>
    </>
  );
}
