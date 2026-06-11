"use client";

import { useState } from "react";
import { FileCode2, GitBranch, ListChecks, ChevronDown, ChevronRight } from "lucide-react";
import type { PlanItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { statusLabel, statusTone } from "./status";

interface PlanCardProps {
  plan: PlanItem;
  defaultExpanded?: boolean;
}

export function PlanCard({ plan, defaultExpanded = false }: PlanCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasDetails = (plan.dependsOn.length > 0) || (plan.filesModified.length > 0) || (plan.summary?.keyResults.length ?? 0 > 0);

  return (
    <article className="rounded-lg border border-white/10 bg-slate-900/70 p-4 transition-colors hover:border-white/15">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">Plan {plan.number}</span>
            <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs", statusTone(plan.status))}>
              {statusLabel(plan.status)}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-white">{plan.title}</h3>
          {plan.goal && !expanded ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-400">{plan.goal}</p>
          ) : plan.goal ? (
            <p className="mt-1.5 text-sm leading-6 text-slate-400">{plan.goal}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-xs text-sky-200">
            <GitBranch className="size-3.5" />
            Wave {plan.wave}
          </div>
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300"
            >
              {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
          {plan.dependsOn.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <ListChecks className="size-4 text-slate-500" />
              依赖：{plan.dependsOn.join(", ")}
            </div>
          ) : null}

          {plan.filesModified.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                <FileCode2 className="size-4" />
                文件
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.filesModified.map((file) => (
                  <code key={file} className="rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-300">
                    {file}
                  </code>
                ))}
              </div>
            </div>
          ) : null}

          {plan.summary?.keyResults && plan.summary.keyResults.length > 0 ? (
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Key Results</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {plan.summary.keyResults.map((result) => (
                  <li key={result} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{result}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
