import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, LayoutDashboard, Zap, Settings } from "lucide-react";
import { getConfiguredProjects } from "@/lib/gsd-bridge";
import { MobileNav } from "@/components/gsd/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "GSD Dashboard",
  description: "GSD 工作流可视化仪表盘",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const projects = await getConfiguredProjects();

  return (
    <html lang="zh-CN" className="h-full dark">
      <body className="min-h-full bg-background text-foreground antialiased">
        <div className="min-h-screen bg-[#0f172a] text-slate-100 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Mobile nav */}
          <MobileNav projects={projects} />

          {/* Desktop sidebar */}
          <aside className="hidden border-b border-white/10 bg-slate-950/80 px-4 py-4 lg:block lg:min-h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-200">
                <LayoutDashboard className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">GSD Dashboard</div>
                <div className="text-xs text-slate-500">工作流状态中心</div>
              </div>
            </div>

            <nav className="mt-6 space-y-6">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">导航</div>
                <div className="space-y-1">
                  <Link
                    href="/"
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:border-sky-400/40"
                  >
                    <LayoutDashboard className="size-4 text-sky-300" />
                    总览
                  </Link>
                  <Link
                    href="/execute"
                    className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-slate-400 transition hover:border-white/10 hover:text-slate-100"
                  >
                    <Zap className="size-4 text-emerald-400" />
                    执行监控
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-slate-400 transition hover:border-white/10 hover:text-slate-100"
                  >
                    <Settings className="size-4 text-slate-500" />
                    设置
                  </Link>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">项目</div>
                <div className="space-y-2">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/?project=${encodeURIComponent(project.id)}`}
                      className="block rounded-lg border border-white/10 bg-slate-900/50 px-3 py-3 text-sm transition hover:border-sky-400/40 hover:bg-slate-900"
                    >
                      <span className="flex items-center gap-2 text-slate-100">
                        <FolderKanban className="size-4 text-slate-500" />
                        {project.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{project.path}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </body>
    </html>
  );
}
