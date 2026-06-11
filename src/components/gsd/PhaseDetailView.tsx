"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpenText, RefreshCw } from "lucide-react";
import type { PhaseDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PlanCard } from "./PlanCard";
import { ProgressBar } from "./ProgressBar";
import { statusLabel, statusTone } from "./status";
import { WaveDiagram } from "./WaveDiagram";

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
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
            <h1 className="mt-3 text-3xl font-semibold text-white">{phase.title}</h1>
            {phase.goal ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{phase.goal}</p> : null}
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="size-3.5" />
            {formatTime(lastUpdated)}
          </div>
        </div>
      </div>

      <section className="grid gap-6 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5">
            <ProgressBar value={phase.progress} completed={phase.completedPlans} total={phase.totalPlans} label="Phase 计划完成度" />
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">Wave 依赖图</h2>
            <WaveDiagram waves={phase.waves} />
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
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">暂无 Plan 文件。</div>
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
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5">
                <MarkdownRenderer content={activeDocument?.content ?? ""} />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">
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
