"use client";

import { useState, useCallback, useRef } from "react";
import { GripVertical, ArrowUp, ArrowDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GsdStatus } from "@/lib/types";
import { statusLabel, statusTone } from "./status";

interface PhaseOrderItem {
  number: number;
  title: string;
  status: GsdStatus;
}

interface DragSortPhaseProps {
  phases: PhaseOrderItem[];
  onReorder?: (newOrder: number[]) => void;
  disabled?: boolean;
}

export function DragSortPhase({ phases, onReorder, disabled = false }: DragSortPhaseProps) {
  const [items, setItems] = useState(phases);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    if (disabled) return;
    setDragIndex(index);
    dragRef.current = index;
  }, [disabled]);

  const handleDragOver = useCallback((index: number) => {
    if (dragRef.current === null || dragRef.current === index) return;
    setOverIndex(index);

    // Reorder items locally
    const newItems = [...items];
    const [draggedItem] = newItems.splice(dragRef.current, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    dragRef.current = index;
  }, [items]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
    if (onReorder && dragRef.current !== null) {
      onReorder(items.map((item) => item.number));
    }
    dragRef.current = null;
  }, [items, onReorder]);

  const moveUp = useCallback((index: number) => {
    if (index === 0 || disabled) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);
    onReorder?.(newItems.map((i) => i.number));
  }, [items, onReorder, disabled]);

  const moveDown = useCallback((index: number) => {
    if (index === items.length - 1 || disabled) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);
    onReorder?.(newItems.map((i) => i.number));
  }, [items, onReorder, disabled]);

  return (
    <div className="space-y-1">
      {items.map((phase, index) => (
        <div
          key={phase.number}
          draggable={!disabled}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => {
            e.preventDefault();
            handleDragOver(index);
          }}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all",
            dragIndex === index ? "border-sky-500/30 bg-sky-500/5 opacity-50" : "border-white/5 bg-slate-900/40",
            overIndex === index && dragIndex !== index && "border-sky-400/40 bg-sky-400/5",
          )}
        >
          {/* Drag handle */}
          <div className={cn("cursor-grab touch-none", disabled && "cursor-default opacity-30")}>
            <GripVertical className="size-4 text-slate-600" />
          </div>

          {/* Phase info */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 font-mono text-xs text-slate-600">P{phase.number}</span>
            <span className="truncate text-sm text-white">{phase.title}</span>
          </div>

          {/* Status badge */}
          <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-xs", statusTone(phase.status))}>
            {statusLabel(phase.status)}
          </span>

          {/* Arrow buttons */}
          {!disabled && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="rounded p-1 text-slate-600 hover:bg-white/5 hover:text-slate-300 disabled:opacity-20"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === items.length - 1}
                className="rounded p-1 text-slate-600 hover:bg-white/5 hover:text-slate-300 disabled:opacity-20"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}
      {disabled && (
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-600">
          <Lock className="size-3" />
          <span>拖拽排序需要编辑权限</span>
        </div>
      )}
    </div>
  );
}
