"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Terminal as TerminalIcon, X, Play, Square, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "success" | "system";
  message: string;
  source?: string;
}

interface LiveLogProps {
  entries: LogEntry[];
  isStreaming: boolean;
  onClear?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  maxHeight?: string;
}

export function LiveLog({ entries, isStreaming, onClear, onStart, onStop, maxHeight = "24rem" }: LiveLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const levelColor = {
    info: "text-slate-400",
    warn: "text-amber-400",
    error: "text-rose-400",
    success: "text-emerald-400",
    system: "text-sky-400",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-4 text-sky-400" />
          <span className="text-xs font-medium text-white">实时日志</span>
          {isStreaming && (
            <span className="flex items-center gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400">STREAMING</span>
            </span>
          )}
          <span className="text-[10px] text-slate-600">{entries.length} 条</span>
        </div>
        <div className="flex items-center gap-1">
          {onClear && (
            <button onClick={onClear} className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300" title="清除">
              <Trash2 className="size-3.5" />
            </button>
          )}
          {isStreaming ? (
            onStop && (
              <button onClick={onStop} className="rounded p-1 text-rose-400 hover:bg-rose-500/10" title="停止">
                <Square className="size-3.5" />
              </button>
            )
          ) : (
            onStart && (
              <button onClick={onStart} className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10" title="开始">
                <Play className="size-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto font-mono text-xs"
        style={{ maxHeight }}
      >
        {entries.length === 0 ? (
          <div className="px-3 py-8 text-center text-slate-600">暂无日志条目</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex gap-2 border-b border-white/[0.02] px-3 py-1 hover:bg-white/[0.02]">
              <span className="shrink-0 text-slate-600">{formatLogTime(entry.timestamp)}</span>
              <span className={cn("shrink-0 w-12", levelColor[entry.level])}>[{entry.level.toUpperCase()}]</span>
              <span className="min-w-0 break-all text-slate-300">{entry.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }}
          className="flex w-full items-center justify-center gap-1 border-t border-white/5 py-1 text-[10px] text-slate-500 hover:text-slate-300"
        >
          <ChevronDown className="size-3" />
          滚动到底部
        </button>
      )}
    </div>
  );
}

function formatLogTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
