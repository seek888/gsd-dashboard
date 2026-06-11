"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Play, Square, Cpu, Clock, FileText, GitCommitHorizontal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LiveLog, type LogEntry } from "@/components/gsd/LiveLog";
import { ContextMeter } from "@/components/gsd/ContextMeter";
import { GSD_COMMANDS } from "@/lib/command-types";
import type { GsdCommandId } from "@/lib/command-types";

interface ExecutionState {
  status: "idle" | "running" | "paused" | "completed" | "failed";
  commandId: GsdCommandId | null;
  startedAt: number | null;
  durationMs: number;
  logs: LogEntry[];
  contextUsed: number;
  contextTotal: number;
  filesModified: number;
  commitsMade: number;
}

const INITIAL_STATE: ExecutionState = {
  status: "idle",
  commandId: null,
  startedAt: null,
  durationMs: 0,
  logs: [],
  contextUsed: 0,
  contextTotal: 200000,
  filesModified: 0,
  commitsMade: 0,
};

export default function ExecutePage() {
  const [projectId, setProjectId] = useState("gsd-ui");
  const [execState, setExecState] = useState<ExecutionState>(INITIAL_STATE);
  const [queue, setQueue] = useState<GsdCommandId[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Timer for running state
  useEffect(() => {
    if (execState.status === "running" && execState.startedAt) {
      timerRef.current = setInterval(() => {
        setExecState((prev) => ({
          ...prev,
          durationMs: Date.now() - (prev.startedAt || Date.now()),
        }));
      }, 100);
      return () => clearInterval(timerRef.current);
    }
  }, [execState.status, execState.startedAt]);

  const addLog = useCallback((level: LogEntry["level"], message: string, source?: string) => {
    setExecState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          level,
          message,
          source,
        },
      ],
    }));
  }, []);

  const executeNext = useCallback(
    async (cmdId: GsdCommandId) => {
      setExecState((prev) => ({
        ...prev,
        status: "running",
        commandId: cmdId,
        startedAt: Date.now(),
        durationMs: 0,
      }));

      addLog("system", `开始执行: ${GSD_COMMANDS.find((c) => c.id === cmdId)?.label || cmdId}`);

      try {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandId: cmdId, projectId, extraArgs: [] }),
        });
        const data = await res.json();

        if (data.success) {
          // Parse stdout as log lines
          const lines = (data.stdout || "").split("\n").filter(Boolean);
          for (const line of lines) {
            addLog("info", line.substring(0, 200));
          }
          addLog("success", `执行完成 (${data.durationMs}ms)`);

          setExecState((prev) => ({
            ...prev,
            status: "completed",
            filesModified: prev.filesModified + (data.stdout?.includes("Created") || data.stdout?.includes("Modified") ? 1 : 0),
          }));
        } else {
          addLog("error", data.stderr?.substring(0, 300) || "执行失败");
          setExecState((prev) => ({ ...prev, status: "failed" }));
        }
      } catch (err) {
        addLog("error", String(err));
        setExecState((prev) => ({ ...prev, status: "failed" }));
      }
    },
    [projectId, addLog],
  );

  const handleStart = useCallback(() => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    executeNext(next);
  }, [queue, executeNext]);

  const handleStop = useCallback(() => {
    setExecState((prev) => ({ ...prev, status: "idle" }));
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleClear = useCallback(() => {
    setExecState(INITIAL_STATE);
  }, []);

  const handleQueueAdd = useCallback((cmdId: GsdCommandId) => {
    setQueue((prev) => [...prev, cmdId]);
  }, []);

  const handleQueueRemove = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Available commands to queue
  const availableCommands = GSD_COMMANDS.filter((c) => c.category !== "admin");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/?project=gsd-ui"
          className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">执行监控</h1>
          <p className="text-xs text-slate-500">实时监控 GSD 命令执行状态</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Command Queue */}
        <div className="space-y-4 lg:col-span-1">
          {/* Command selection */}
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
            <h3 className="mb-3 text-sm font-medium text-white">添加到队列</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {availableCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleQueueAdd(cmd.id)}
                  disabled={execState.status === "running"}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-white/5 disabled:opacity-50"
                >
                  <Play className="size-3 text-sky-400" />
                  <span className="text-white">{cmd.label}</span>
                  <span className={cn(
                    "ml-auto rounded px-1 py-0.5 text-[9px]",
                    cmd.isWrite ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500",
                  )}>
                    {cmd.isWrite ? "写" : "读"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Queue */}
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">执行队列</h3>
              <span className="text-[10px] text-slate-500">{queue.length} 项</span>
            </div>
            {queue.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-600">队列为空</p>
            ) : (
              <div className="space-y-1.5">
                {queue.map((cmdId, i) => {
                  const cmd = GSD_COMMANDS.find((c) => c.id === cmdId);
                  return (
                    <div key={`${cmdId}-${i}`} className="flex items-center gap-2 rounded-md bg-slate-800/50 px-2.5 py-1.5 text-xs">
                      <span className="text-slate-600">{i + 1}.</span>
                      <span className="text-white">{cmd?.label || cmdId}</span>
                      <button
                        onClick={() => handleQueueRemove(i)}
                        className="ml-auto text-slate-600 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleStart}
                disabled={queue.length === 0 || execState.status === "running"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/30 disabled:opacity-50"
              >
                <Play className="size-3" />
                执行队列
              </button>
              {execState.status === "running" && (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 rounded-md bg-rose-500/20 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/30"
                >
                  <Square className="size-3" />
                  停止
                </button>
              )}
            </div>
          </div>

          {/* Agent Resources */}
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
            <h3 className="mb-3 text-sm font-medium text-white">Agent 资源</h3>
            <div className="space-y-3">
              <ContextMeter
                used={execState.contextUsed}
                total={execState.contextTotal}
                size="md"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <FileText className="size-3.5 text-sky-400" />
                  <span>{execState.filesModified} 文件</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <GitCommitHorizontal className="size-3.5 text-emerald-400" />
                  <span>{execState.commitsMade} 提交</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Log */}
        <div className="space-y-4 lg:col-span-2">
          {/* Status bar */}
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3">
            <div className={cn(
              "size-2.5 rounded-full",
              execState.status === "running" && "animate-pulse bg-emerald-400",
              execState.status === "idle" && "bg-slate-600",
              execState.status === "completed" && "bg-emerald-400",
              execState.status === "failed" && "bg-rose-400",
              execState.status === "paused" && "bg-amber-400",
            )} />
            <span className={cn(
              "text-sm font-medium",
              execState.status === "running" && "text-emerald-400",
              execState.status === "completed" && "text-emerald-400",
              execState.status === "failed" && "text-rose-400",
              (execState.status === "idle" || execState.status === "paused") && "text-slate-400",
            )}>
              {execState.commandId
                ? `${GSD_COMMANDS.find((c) => c.id === execState.commandId)?.label || execState.commandId}`
                : "等待命令"}
            </span>
            {execState.startedAt && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="size-3.5" />
                {formatDuration(execState.durationMs)}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Cpu className="size-3.5" />
              {projectId}
            </div>
          </div>

          {/* Live Log */}
          <LiveLog
            entries={execState.logs}
            isStreaming={execState.status === "running"}
            onClear={handleClear}
            onStop={handleStop}
            maxHeight="32rem"
          />
        </div>
      </div>
    </main>
  );
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  if (min > 0) return `${min}m ${s}s`;
  return `${s}.${Math.floor((ms % 1000) / 100)}s`;
}
