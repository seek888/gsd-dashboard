"use client";

import { useState } from "react";
import { LayoutDashboard, Menu, X, Zap, Settings, FolderKanban } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  projects: { id: string; name: string; path: string }[];
}

export function MobileNav({ projects }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-200">
            <LayoutDashboard className="size-4" />
          </div>
          <span className="text-sm font-semibold text-white">GSD Dashboard</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 text-slate-400 hover:bg-white/5"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-b border-white/10 bg-slate-950/95 px-4 pb-4 pt-2">
          <nav className="space-y-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <LayoutDashboard className="size-4 text-sky-300" />
              总览
            </Link>
            <Link
              href="/execute"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <Zap className="size-4 text-emerald-400" />
              执行监控
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <Settings className="size-4 text-slate-500" />
              设置
            </Link>
          </nav>

          <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-600">项目</div>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/?project=${encodeURIComponent(project.id)}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5"
              >
                <FolderKanban className="size-3.5" />
                {project.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
