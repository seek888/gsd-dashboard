"use client";

import { cn } from "@/lib/utils";

// ── Skeleton Base ─────────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-800/60",
        className,
      )}
    />
  );
}

// ── Preset Skeletons ──────────────────────────────────────────

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          className={cn(
            "h-3.5",
            i === lines - 1 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-white/5 bg-slate-900/40 p-4 space-y-3", className)}>
      <SkeletonBox className="h-4 w-1/3" />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 xl:grid-cols-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <SkeletonBox className="mb-2 h-3 w-16" />
          <SkeletonBox className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <SkeletonBox className="h-4 w-24" />
        <SkeletonBox className="h-8 w-64" />
        <SkeletonText lines={2} />
      </div>
      <SkeletonCard className="h-24" />
      <SkeletonGrid count={3} />
    </div>
  );
}
