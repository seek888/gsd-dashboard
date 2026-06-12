"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, FolderOpen, Save, Workflow, Settings, Loader2, CheckCircle2, FolderSearch } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────

interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  description?: string;
}

interface PathValidation {
  valid: boolean;
  path?: string;
  hasPlanning?: boolean;
  planningInfo?: {
    projectName?: string;
    files?: string[];
    phasesDir?: boolean;
    [key: string]: unknown;
  };
  reason?: string;
}

// ── Workflow Template ─────────────────────────────────────────

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  phases: { title: string; goal: string }[];
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "standard",
    name: "标准 GSD 流程",
    description: "Context → Research → Plan → Execute → Verify — 适用于大多数功能开发",
    phases: [
      { title: "探索与分析", goal: "理解需求、收集上下文、定义技术方案" },
      { title: "设计与规划", goal: "架构设计、API 设计、数据库设计" },
      { title: "核心实现", goal: "实现核心功能和关键路径" },
      { title: "完善与优化", goal: "边界处理、性能优化、错误处理" },
      { title: "测试与验证", goal: "单元测试、集成测试、UAT 验证" },
      { title: "发布准备", goal: "文档更新、部署配置、发布检查" },
    ],
  },
  {
    id: "rapid-prototype",
    name: "快速原型",
    description: "3 Phase 快速原型流程 — 适合 PoC 和 MVP",
    phases: [
      { title: "原型搭建", goal: "核心功能的最小可用实现" },
      { title: "功能完善", goal: "补充核心功能和基本测试" },
      { title: "交付", goal: "文档、部署和演示准备" },
    ],
  },
  {
    id: "bugfix",
    name: "Bug 修复流程",
    description: "2 Phase 快速修复流程",
    phases: [
      { title: "问题定位与修复", goal: "复现问题、定位根因、实施修复" },
      { title: "验证与回归", goal: "验证修复效果、回归测试" },
    ],
  },
];

// ── Settings Page ─────────────────────────────────────────────

export default function SettingsPage() {
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newProject, setNewProject] = useState({ id: "", name: "", path: "" });
  const [pathValidation, setPathValidation] = useState<PathValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  // 加载当前配置
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 验证路径
  const validatePath = useCallback(async (inputPath: string) => {
    if (!inputPath.trim()) {
      setPathValidation(null);
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: inputPath }),
      });
      const data = await res.json();
      setPathValidation(data);
    } catch {
      setPathValidation({ valid: false, reason: "验证失败" });
    } finally {
      setValidating(false);
    }
  }, []);

  const addProject = useCallback(() => {
    if (!newProject.id || !newProject.name || !newProject.path) return;
    if (pathValidation && !pathValidation.valid) {
      toast({ type: "error", title: "路径无效", description: pathValidation.reason || "请输入有效的项目路径" });
      return;
    }
    setProjects((prev) => [...prev, { ...newProject }]);
    setNewProject({ id: "", name: "", path: "" });
    setPathValidation(null);
    toast({ type: "success", title: "项目已添加", description: "记得点击保存配置" });
  }, [newProject, pathValidation, toast]);

  const removeProject = useCallback((index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast({ type: "success", title: "配置已保存", description: "刷新页面即可生效" });
      } else {
        toast({ type: "error", title: "保存失败", description: data.error || "未知错误" });
      }
    } catch (err) {
      toast({ type: "error", title: "保存失败", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }, [projects, toast]);

  const applyTemplate = useCallback((template: WorkflowTemplate) => {
    setSelectedTemplate(template.id);
    toast({ type: "info", title: `已选择: ${template.name}`, description: "模板将在项目初始化时应用" });
  }, [toast]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-slate-500" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="size-5 text-slate-400" />
          <div>
            <h1 className="text-xl font-semibold text-white">设置</h1>
            <p className="text-xs text-slate-500">项目配置和工作流模板</p>
          </div>
        </div>
      </div>

      {/* Project Management */}
      <section className="mb-8 rounded-lg border border-white/10 bg-slate-900/60 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-white">
          <FolderOpen className="size-4 text-sky-400" />
          项目管理
        </h2>

        <div className="space-y-2">
          {projects.map((project, i) => (
            <div key={project.id} className="flex items-center gap-3 rounded-md border border-white/5 bg-slate-800/50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">{project.name}</div>
                <div className="truncate font-mono text-[10px] text-slate-600">{project.path}</div>
              </div>
              <button
                onClick={() => removeProject(i)}
                className="rounded p-1 text-slate-600 hover:bg-white/5 hover:text-rose-400"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add project form */}
        <div className="mt-4 space-y-3 rounded-md border border-dashed border-white/10 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              placeholder="ID (如 my-project)"
              value={newProject.id}
              onChange={(e) => setNewProject((p) => ({ ...p, id: e.target.value }))}
              className="rounded-md border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400"
            />
            <input
              placeholder="名称"
              value={newProject.name}
              onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
              className="rounded-md border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400"
            />
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  placeholder="项目路径"
                  value={newProject.path}
                  onChange={(e) => {
                    setNewProject((p) => ({ ...p, path: e.target.value }));
                    setPathValidation(null);
                  }}
                  onBlur={() => newProject.path && validatePath(newProject.path)}
                  className="w-full rounded-md border border-white/10 bg-slate-950 py-1.5 pl-2.5 pr-8 text-xs text-white outline-none focus:border-sky-400"
                />
                {validating && <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-slate-500" />}
              </div>
              <button
                onClick={() => validatePath(newProject.path)}
                disabled={!newProject.path.trim() || validating}
                className="shrink-0 rounded-md border border-white/10 px-2 text-xs text-slate-400 hover:bg-white/5 disabled:opacity-50"
                title="验证路径"
              >
                <FolderSearch className="size-3.5" />
              </button>
            </div>
          </div>

          {/* 路径验证结果 */}
          {pathValidation && (
            <div className={cn(
              "rounded-md border p-2 text-xs",
              pathValidation.valid && pathValidation.hasPlanning
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : pathValidation.valid
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-300",
            )}>
              {pathValidation.valid && pathValidation.hasPlanning
                ? <span className="flex items-center gap-1"><CheckCircle2 className="size-3" /> 发现 .planning 目录 ✓</span>
                : pathValidation.valid
                  ? "路径有效但未找到 .planning 目录"
                  : pathValidation.reason || "路径无效"}
            </div>
          )}

          <button
            onClick={addProject}
            disabled={!newProject.id || !newProject.name || !newProject.path}
            className="flex items-center gap-1.5 rounded-md bg-sky-500/20 px-3 py-1.5 text-xs text-sky-400 hover:bg-sky-500/30 disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            添加项目
          </button>
        </div>
      </section>

      {/* Workflow Templates */}
      <section className="mb-8 rounded-lg border border-white/10 bg-slate-900/60 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-white">
          <Workflow className="size-4 text-emerald-400" />
          工作流模板
        </h2>

        <div className="space-y-3">
          {WORKFLOW_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={cn(
                "cursor-pointer rounded-lg border p-4 transition-colors",
                selectedTemplate === template.id
                  ? "border-sky-500/30 bg-sky-500/5"
                  : "border-white/5 bg-slate-800/30 hover:border-white/10",
              )}
              onClick={() => applyTemplate(template)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{template.name}</span>
                <span className="text-[10px] text-slate-500">{template.phases.length} Phases</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{template.description}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {template.phases.map((phase, i) => (
                  <span key={i} className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">
                    {i + 1}. {phase.title}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/30 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "保存中..." : "保存配置"}
        </button>
      </div>
    </main>
  );
}
