"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, FolderOpen, Save, RotateCcw, Workflow, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

interface ProjectConfig {
  id: string;
  name: string;
  path: string;
}

export default function SettingsPage() {
  // Load projects from env (simplified — in production this would be stored in a config file)
  const [projects, setProjects] = useState<ProjectConfig[]>(() => {
    try {
      return JSON.parse(process.env.NEXT_PUBLIC_GSD_PROJECTS || "[]");
    } catch {
      return [];
    }
  });
  const [newProject, setNewProject] = useState({ id: "", name: "", path: "" });
  const [saved, setSaved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const addProject = useCallback(() => {
    if (!newProject.id || !newProject.name || !newProject.path) return;
    setProjects((prev) => [...prev, { ...newProject }]);
    setNewProject({ id: "", name: "", path: "" });
  }, [newProject]);

  const removeProject = useCallback((index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    // In a real implementation, this would update .env.local or a config file
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const applyTemplate = useCallback((template: WorkflowTemplate) => {
    setSelectedTemplate(template.id);
    // In a real implementation, this would create ROADMAP.md files
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/?project=gsd-ui" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
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
        <div className="mt-4 space-y-2 rounded-md border border-dashed border-white/10 p-3">
          <div className="grid grid-cols-3 gap-2">
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
            <input
              placeholder="路径"
              value={newProject.path}
              onChange={(e) => setNewProject((p) => ({ ...p, path: e.target.value }))}
              className="rounded-md border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400"
            />
          </div>
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

              {/* Phase preview */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {template.phases.map((phase, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500"
                  >
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
          className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/30"
        >
          <Save className="size-4" />
          保存配置
        </button>
        {saved && <span className="text-xs text-emerald-400">✓ 已保存</span>}
      </div>
    </main>
  );
}
