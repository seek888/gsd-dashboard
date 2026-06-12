"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, CheckCircle2, X, Zap } from "lucide-react";
import type { DashboardStatus } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ── Wave Advance Prompt ───────────────────────────────────────

interface WaveAdvancePromptProps {
  status: DashboardStatus;
  onAdvanced?: () => void;
}

interface WaveCompletionInfo {
  phase: number;
  wave: number;
  canAdvance: boolean;
  nextWave?: number;
  nextPlan?: number;
  reason?: string;
}

export function WaveAdvancePrompt({ status, onAdvanced }: WaveAdvancePromptProps) {
  const [completion, setCompletion] = useState<WaveCompletionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const { toast } = useToast();

  // 检测 Wave 完成状态
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/blockers?project=${encodeURIComponent(status.activeProject.id)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.waveCompletion?.canAdvance) {
          setCompletion(data.waveCompletion);
          setDismissed(false);
        } else {
          setCompletion(null);
        }
      } catch { /* ignore */ }
    }

    check();
    // 每 10 秒检查一次
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [status.activeProject.id]);

  const handleAdvance = useCallback(async () => {
    if (!completion || advancing) return;

    setAdvancing(true);
    try {
      const res = await fetch("/api/wave-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: status.activeProject.id }),
      });
      const data = await res.json();

      if (res.ok && data.execution) {
        toast({
          type: "success",
          title: `Wave ${completion.wave} → ${completion.nextWave || "?"} 推进成功`,
          description: "执行已启动",
        });
        setCompletion(null);
        onAdvanced?.();
      } else {
        toast({
          type: "error",
          title: "Wave 推进失败",
          description: data.error || data.waveCompletion?.reason || "未知原因",
        });
      }
    } catch (err) {
      toast({ type: "error", title: "请求失败", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setAdvancing(false);
    }
  }, [completion, advancing, status.activeProject.id, toast, onAdvanced]);

  if (!completion || dismissed) return null;

  return (
    <div className={cn(
      "rounded-lg border p-4",
      "border-emerald-500/30 bg-emerald-500/5",
      "animate-in slide-in-from-top-2 fade-in duration-300",
    )}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-emerald-300">
            Wave {completion.wave} 已完成 ✅
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {completion.reason || `可以推进到 Wave ${completion.nextWave}`}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              <Zap className="size-3.5" />
              {advancing ? "推进中..." : `推进到 Wave ${completion.nextWave}`}
              {!advancing && <ArrowRight className="size-3" />}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              稍后
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 text-slate-600 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
