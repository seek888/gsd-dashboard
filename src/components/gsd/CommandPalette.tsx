"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Play, Shield, Terminal, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GSD_COMMANDS, type GsdCommandId } from "@/lib/command-types";

interface CommandPaletteProps {
  projectId: string;
  onCommandComplete?: (commandId: GsdCommandId, success: boolean) => void;
}

interface ExecutionState {
  loading: boolean;
  commandId: GsdCommandId | null;
  result: {
    success: boolean;
    stdout: string;
    stderr: string;
    durationMs: number;
  } | null;
}

export function CommandPalette({ projectId, onCommandComplete }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [execState, setExecState] = useState<ExecutionState>({ loading: false, commandId: null, result: null });
  const [confirmCmd, setConfirmCmd] = useState<typeof GSD_COMMANDS[number] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setConfirmCmd(null);
        setExecState({ loading: false, commandId: null, result: null });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filteredCommands = GSD_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()) ||
      cmd.id.toLowerCase().includes(query.toLowerCase()),
  );

  const executeCommand = useCallback(async (cmdId: GsdCommandId, args?: string[]) => {
    setExecState({ loading: true, commandId: cmdId, result: null });
    try {
      const command = GSD_COMMANDS.find((item) => item.id === cmdId);
      const res = command?.isWrite
        ? await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "start",
              command: cmdId,
              projectId,
              args: args || [],
              confirmed: true,
            }),
          })
        : await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commandId: cmdId, projectId, extraArgs: args || [] }),
          });
      const data = await res.json();
      const result = command?.isWrite
        ? {
            success: res.ok && Boolean(data.execution),
            stdout: data.execution ? `执行已启动: ${data.execution.executionId}` : "",
            stderr: data.error || "",
            durationMs: data.execution?.durationMs ?? 0,
          }
        : data;
      setExecState({ loading: false, commandId: cmdId, result });
      onCommandComplete?.(cmdId, result.success);
    } catch (err) {
      setExecState({
        loading: false,
        commandId: cmdId,
        result: { success: false, stdout: "", stderr: String(err), durationMs: 0 },
      });
      onCommandComplete?.(cmdId, false);
    }
  }, [projectId, onCommandComplete]);

  const handleSelect = (cmd: typeof GSD_COMMANDS[number]) => {
    if (cmd.isWrite) {
      setConfirmCmd(cmd);
    } else {
      executeCommand(cmd.id);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
      >
        <Search className="size-3.5" />
        <span>命令面板</span>
        <kbd className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <Search className="size-4 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索命令..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">ESC</kbd>
        </div>

        {/* Confirm dialog */}
        {confirmCmd && (
          <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Shield className="size-4" />
              <span className="text-sm font-medium">确认执行</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              此操作会修改项目状态: <span className="text-white">{confirmCmd.label}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{confirmCmd.description}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  executeCommand(confirmCmd.id);
                  setConfirmCmd(null);
                }}
                className="rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30"
              >
                确认执行
              </button>
              <button
                onClick={() => setConfirmCmd(null)}
                className="rounded-md bg-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-600"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Execution result */}
        {execState.result && (
          <div className={cn(
            "border-b px-4 py-3",
            execState.result.success ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5",
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {execState.result.success ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="size-4 text-rose-400" />
                )}
                <span className={cn("text-sm font-medium", execState.result.success ? "text-emerald-400" : "text-rose-400")}>
                  {execState.result.success ? "执行成功" : "执行失败"}
                </span>
              </div>
              <span className="text-xs text-slate-500">{execState.result.durationMs}ms</span>
            </div>
            {execState.result.stdout && (
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-400">
                {execState.result.stdout.substring(0, 500)}
              </pre>
            )}
            {execState.result.stderr && (
              <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-950 p-2 text-xs text-rose-400/80">
                {execState.result.stderr.substring(0, 500)}
              </pre>
            )}
          </div>
        )}

        {/* Loading */}
        {execState.loading && (
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <Loader2 className="size-4 animate-spin text-sky-400" />
            <span className="text-sm text-slate-400">执行中...</span>
          </div>
        )}

        {/* Command list */}
        <div className="max-h-64 overflow-y-auto p-2">
          {filteredCommands.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-slate-500">无匹配命令</div>
          )}
          {filteredCommands.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => handleSelect(cmd)}
              disabled={execState.loading}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/5 disabled:opacity-50"
            >
              {cmd.isWrite ? (
                <Shield className="size-4 text-amber-400" />
              ) : cmd.category === "admin" ? (
                <Terminal className="size-4 text-sky-400" />
              ) : (
                <Play className="size-4 text-emerald-400" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">{cmd.label}</div>
                <div className="truncate text-xs text-slate-500">{cmd.description}</div>
              </div>
              <span className={cn(
                "rounded px-1.5 py-0.5 text-[10px]",
                cmd.category === "write" ? "bg-amber-500/10 text-amber-400" :
                cmd.category === "admin" ? "bg-sky-500/10 text-sky-400" :
                "bg-slate-700 text-slate-400",
              )}>
                {cmd.category === "write" ? "写" : cmd.category === "admin" ? "管理" : "读"}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-4 py-2 text-[10px] text-slate-600">
          ↑↓ 导航 · ↵ 执行 · ESC 关闭
        </div>
      </div>
    </div>
  );
}
