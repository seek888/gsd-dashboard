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
  status: "idle" | "pending" | "running" | "completed" | "failed" | "stopped";
  commandId: GsdCommandId | null;
  executionId: string | null;
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
  executionId: null,
  startedAt: null,
  durationMs: 0,
  logs: [],
  contextUsed: 0,
  contextTotal: 200000,
  filesModified: 0,
  commitsMade: 0,
};

type ExecuteStatus = Exclude<ExecutionState["status"], "idle">;

interface ExecuteStartResponse {
  execution?: {
    executionId: string;
    status: ExecuteStatus;
    durationMs: number;
  };
  error?: string;
}

interface ExecuteStreamLogEvent {
  type: "log";
  executionId: string;
  log: LogEntry;
}

interface ExecuteStreamStatusEvent {
  type: "status_change";
  executionId: string;
  status: ExecuteStatus;
  timestamp: number;
}

interface ExecuteStreamCompletedEvent {
  type: "completed";
  executionId: string;
  status: "completed" | "failed" | "stopped";
  durationMs: number;
  timestamp: number;
}

interface ExecuteStreamErrorEvent {
  type: "error";
  executionId: string;
  message: string;
  timestamp: number;
}

export default function ExecutePage() {
  const [projectId, setProjectId] = useState("default");
  const [execState, setExecState] = useState<ExecutionState>(INITIAL_STATE);
  const [queue, setQueue] = useState<GsdCommandId[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setProjectId(new URLSearchParams(window.location.search).get("project") ?? "default");
  }, []);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Timer for running state
  useEffect(() => {
    if ((execState.status === "pending" || execState.status === "running") && execState.startedAt) {
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

  const refreshProjectStatus = useCallback(async () => {
    const suffix = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
    await fetch(`/api/status${suffix}`, { cache: "no-store" }).catch(() => undefined);
  }, [projectId]);

  const attachStream = useCallback(
    (executionId: string) => {
      eventSourceRef.current?.close();
      const eventSource = new EventSource(`/api/execute/${executionId}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("log", (event) => {
        const data = JSON.parse(event.data) as ExecuteStreamLogEvent;
        setExecState((prev) => ({
          ...prev,
          logs: [...prev.logs, data.log],
        }));
      });

      eventSource.addEventListener("status_change", (event) => {
        const data = JSON.parse(event.data) as ExecuteStreamStatusEvent;
        setExecState((prev) => ({
          ...prev,
          status: data.status,
          durationMs: data.status === "running" || data.status === "pending" ? prev.durationMs : prev.durationMs,
        }));
      });

      eventSource.addEventListener("completed", async (event) => {
        const data = JSON.parse(event.data) as ExecuteStreamCompletedEvent;
        setExecState((prev) => ({
          ...prev,
          status: data.status,
          durationMs: data.durationMs,
        }));
        eventSource.close();
        eventSourceRef.current = null;
        await refreshProjectStatus();
        addLog("system", "项目状态已刷新");
      });

      eventSource.addEventListener("error", (event) => {
        const messageEvent = event as MessageEvent<string>;
        if (!messageEvent.data) return;
        const data = JSON.parse(messageEvent.data) as ExecuteStreamErrorEvent;
        addLog("error", data.message);
      });

      eventSource.onerror = () => {
        addLog("warn", "日志流连接中断，将由浏览器自动重连");
      };
    },
    [addLog, refreshProjectStatus],
  );

  const executeNext = useCallback(
    async (cmdId: GsdCommandId) => {
      const cmd = GSD_COMMANDS.find((c) => c.id === cmdId);
      if (!cmd) return;

      if (cmd.isWrite && !window.confirm(`确认执行写操作「${cmd.label}」？`)) {
        addLog("warn", `已取消执行: ${cmd.label}`);
        return;
      }

      setExecState((prev) => ({
        ...prev,
        status: "pending",
        commandId: cmdId,
        executionId: null,
        startedAt: Date.now(),
        durationMs: 0,
        logs: [],
      }));

      addLog("system", `提交执行: ${cmd.label}`);

      try {
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            command: cmdId,
            projectId,
            args: [],
            confirmed: cmd.isWrite,
          }),
        });
        const data = (await res.json()) as ExecuteStartResponse;

        if (!res.ok || !data.execution) {
          throw new Error(data.error || "启动执行失败");
        }

        setExecState((prev) => ({
          ...prev,
          status: data.execution!.status,
          executionId: data.execution!.executionId,
        }));
        attachStream(data.execution.executionId);
      } catch (err) {
        addLog("error", err instanceof Error ? err.message : String(err));
        setExecState((prev) => ({ ...prev, status: "failed" }));
      }
    },
    [projectId, addLog, attachStream],
  );

  const handleStart = useCallback(() => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    executeNext(next);
  }, [queue, executeNext]);

  const handleStop = useCallback(async () => {
    if (!execState.executionId) return;
    await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", executionId: execState.executionId }),
    }).catch((err) => addLog("error", String(err)));
    if (timerRef.current) clearInterval(timerRef.current);
  }, [execState.executionId, addLog]);

  const handleClear = useCallback(() => {
    if (execState.status === "pending" || execState.status === "running") {
      setExecState((prev) => ({ ...prev, logs: [] }));
      return;
    }
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setExecState(INITIAL_STATE);
  }, [execState.status]);

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
          href={`/?project=${encodeURIComponent(projectId)}`}
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
                  disabled={execState.status === "pending" || execState.status === "running"}
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
                disabled={queue.length === 0 || execState.status === "pending" || execState.status === "running"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/30 disabled:opacity-50"
              >
                <Play className="size-3" />
                执行队列
              </button>
              {(execState.status === "pending" || execState.status === "running") && (
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
              execState.status === "pending" && "animate-pulse bg-sky-400",
              execState.status === "running" && "animate-pulse bg-emerald-400",
              execState.status === "idle" && "bg-slate-600",
              execState.status === "completed" && "bg-emerald-400",
              execState.status === "failed" && "bg-rose-400",
              execState.status === "stopped" && "bg-amber-400",
            )} />
            <span className={cn(
              "text-sm font-medium",
              execState.status === "pending" && "text-sky-400",
              execState.status === "running" && "text-emerald-400",
              execState.status === "completed" && "text-emerald-400",
              execState.status === "failed" && "text-rose-400",
              (execState.status === "idle" || execState.status === "stopped") && "text-slate-400",
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
            isStreaming={execState.status === "pending" || execState.status === "running"}
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
