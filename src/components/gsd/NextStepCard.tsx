"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, ChevronRight, Loader2, Sparkles, Zap } from "lucide-react";
import type { DashboardStatus } from "@/lib/types";
import { getPrimaryNextStep, suggestNextSteps, type NextStepSuggestion } from "@/lib/next-step-engine";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ── Next Step Card ────────────────────────────────────────────

interface NextStepCardProps {
  status: DashboardStatus;
  onExecuted?: () => void;
}

const TONE_STYLES: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  blue: { border: "border-sky-500/30", bg: "bg-sky-500/5", text: "text-sky-300", icon: "text-sky-400" },
  green: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-300", icon: "text-emerald-400" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-300", icon: "text-amber-400" },
  rose: { border: "border-rose-500/30", bg: "bg-rose-500/5", text: "text-rose-300", icon: "text-rose-400" },
  slate: { border: "border-slate-500/30", bg: "bg-slate-500/5", text: "text-slate-300", icon: "text-slate-400" },
};

export function NextStepCard({ status, onExecuted }: NextStepCardProps) {
  const primary = getPrimaryNextStep(status);
  const allSteps = suggestNextSteps(status);
  const [executing, setExecuting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();

  if (!primary) return null;

  // 已完成状态特殊渲染
  if (primary.category === "complete") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-emerald-400" />
          <div>
            <div className="text-sm font-medium text-emerald-300">{primary.title}</div>
            <div className="text-xs text-emerald-400/60">{primary.description}</div>
          </div>
        </div>
      </div>
    );
  }

  const tone = TONE_STYLES[primary.tone] ?? TONE_STYLES.slate;

  const handleExecute = useCallback(async () => {
    if (executing) return;
    setExecuting(true);

    try {
      // 读命令走 /api/command
      if (primary.category === "review") {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commandId: primary.commandId,
            projectId: status.activeProject.id,
            extraArgs: primary.args,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success !== false) {
          toast({ type: "success", title: `${primary.title} 完成`, description: "结果已更新" });
        } else {
          toast({ type: "error", title: `${primary.title} 失败`, description: data.error || "未知错误" });
        }
      } else {
        // 写命令走 /api/execute
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            command: primary.commandId,
            projectId: status.activeProject.id,
            args: primary.args,
            confirmed: true,
          }),
        });
        const data = await res.json();
        if (res.ok && data.execution) {
          toast({
            type: "success",
            title: `开始执行: ${primary.title}`,
            description: "可以在执行监控页面查看实时日志",
            duration: 3000,
          });
        } else {
          toast({ type: "error", title: "执行失败", description: data.error || "启动失败" });
        }
      }
    } catch (err) {
      toast({ type: "error", title: "请求失败", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setExecuting(false);
      // 延迟刷新，给后端执行时间
      setTimeout(() => onExecuted?.(), 1500);
    }
  }, [primary, executing, status.activeProject.id, toast, onExecuted]);

  return (
    <div className={cn("rounded-lg border p-4", tone.border, tone.bg)}>
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", tone.bg)}>
          <Sparkles className={cn("size-4", tone.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">建议下一步</span>
          </div>
          <div className={cn("mt-1 text-sm font-semibold", tone.text)}>{primary.title}</div>
          <div className="mt-1 text-xs text-slate-400">{primary.description}</div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={executing}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                tone.bg,
                tone.text,
                "hover:opacity-80",
              )}
            >
              {executing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Zap className="size-3.5" />
              )}
              {executing ? "执行中..." : "立即执行"}
            </button>

            {allSteps.length > 1 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
              >
                更多操作 ({allSteps.length - 1})
                <ChevronRight className={cn("size-3 transition-transform", showAll && "rotate-90")} />
              </button>
            )}
          </div>

          {/* 展开所有建议 */}
          {showAll && allSteps.length > 1 && (
            <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
              {allSteps.slice(1).map((step) => {
                const s = TONE_STYLES[step.tone] ?? TONE_STYLES.slate;
                return (
                  <div key={step.id} className="flex items-center gap-2 text-xs">
                    <div className={cn("size-1.5 rounded-full", s.icon.replace("text-", "bg-"))} />
                    <span className="text-slate-300">{step.title}</span>
                    <span className="text-slate-600">—</span>
                    <span className="text-slate-500">{step.description}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
