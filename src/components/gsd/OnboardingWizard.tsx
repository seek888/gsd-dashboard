"use client";

import { useState, useCallback } from "react";
import { FolderSearch, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
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

interface OnboardingWizardProps {
  onComplete: () => void;
}

// ── Wizard Steps ──────────────────────────────────────────────

type Step = "welcome" | "select-path" | "confirm" | "done";

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [pathInput, setPathInput] = useState("");
  const [validation, setValidation] = useState<PathValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 验证路径
  const validatePath = useCallback(async (inputPath: string) => {
    if (!inputPath.trim()) {
      setValidation(null);
      return;
    }

    setValidating(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: inputPath }),
      });
      const data = (await res.json()) as PathValidation;
      setValidation(data);
    } catch {
      setValidation({ valid: false, reason: "验证失败" });
    } finally {
      setValidating(false);
    }
  }, []);

  // 添加项目
  const addProject = useCallback(() => {
    if (!validation?.valid || !validation.hasPlanning) return;

    const name = (validation.planningInfo?.projectName as string) || pathInput.split("/").pop() || "未命名项目";
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    setProjects((prev) => {
      if (prev.some((p) => p.id === id)) return prev;
      return [...prev, { id, name, path: validation.path || pathInput }];
    });
    setPathInput("");
    setValidation(null);
  }, [validation, pathInput]);

  // 移除项目
  const removeProject = useCallback((index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 保存并完成
  const saveAndComplete = useCallback(async () => {
    if (projects.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast({ type: "success", title: "配置已保存", description: "即将跳转到 Dashboard" });
        setStep("done");
        setTimeout(() => onComplete(), 1500);
      } else {
        toast({ type: "error", title: "保存失败", description: data.error });
      }
    } catch (err) {
      toast({ type: "error", title: "保存失败", description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }, [projects, toast, onComplete]);

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg">
        {step === "welcome" && (
          <WelcomeStep onNext={() => setStep("select-path")} />
        )}
        {step === "select-path" && (
          <SelectPathStep
            projects={projects}
            pathInput={pathInput}
            setPathInput={setPathInput}
            validation={validation}
            validating={validating}
            validatePath={validatePath}
            addProject={addProject}
            removeProject={removeProject}
            onBack={() => setStep("welcome")}
            onNext={() => setStep("confirm")}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            projects={projects}
            saving={saving}
            onBack={() => setStep("select-path")}
            onSave={saveAndComplete}
          />
        )}
        {step === "done" && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-16 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-semibold text-white">配置完成！</h2>
            <p className="mt-2 text-slate-400">正在加载 Dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Welcome Step ──────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-400/10">
        <Sparkles className="size-10 text-sky-300" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-white">欢迎使用 GSD Dashboard</h1>
      <p className="mt-4 text-base leading-7 text-slate-400">
        可视化管理你的 GSD 工作流项目。<br />
        首先需要配置要监控的项目目录。
      </p>

      <div className="mt-8 space-y-3 text-left rounded-lg border border-white/10 bg-slate-900/60 p-5">
        <h3 className="text-sm font-medium text-white">快速开始只需 2 步：</h3>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="flex size-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400">1</span>
          输入包含 <code className="rounded bg-slate-800 px-1 text-sky-300">.planning/</code> 目录的项目路径
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="flex size-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400">2</span>
          确认配置，开始使用
        </div>
      </div>

      <button
        onClick={onNext}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-500/20 px-6 py-3 text-sm font-medium text-sky-400 transition hover:bg-sky-500/30"
      >
        开始配置
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

// ── Select Path Step ──────────────────────────────────────────

function SelectPathStep({
  projects, pathInput, setPathInput, validation, validating, validatePath, addProject, removeProject,
  onBack, onNext,
}: {
  projects: ProjectConfig[];
  pathInput: string;
  setPathInput: (v: string) => void;
  validation: PathValidation | null;
  validating: boolean;
  validatePath: (p: string) => void;
  addProject: () => void;
  removeProject: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white">配置项目路径</h2>
      <p className="mt-2 text-sm text-slate-400">输入包含 <code className="rounded bg-slate-800 px-1 text-sky-300">.planning/</code> 目录的项目绝对路径</p>

      {/* 已添加的项目 */}
      {projects.length > 0 && (
        <div className="mt-4 space-y-2">
          {projects.map((project, i) => (
            <div key={project.id} className="flex items-center gap-3 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white">{project.name}</div>
                <div className="truncate text-xs text-slate-500">{project.path}</div>
              </div>
              <button onClick={() => removeProject(i)} className="text-slate-600 hover:text-rose-400">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入路径 */}
      <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FolderSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={pathInput}
              onChange={(e) => {
                setPathInput(e.target.value);
                // 延迟验证
                const v = e.target.value;
                setTimeout(() => validatePath(v), 500);
              }}
              placeholder="/path/to/your/project"
              className="w-full rounded-md border border-white/10 bg-slate-950 py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-sky-400"
            />
          </div>
          <button
            onClick={() => validatePath(pathInput)}
            disabled={validating || !pathInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            {validating ? <Loader2 className="size-3.5 animate-spin" /> : <FolderSearch className="size-3.5" />}
            验证
          </button>
        </div>

        {/* 验证结果 */}
        {validation && (
          <div className={cn(
            "rounded-md border p-3",
            validation.valid && validation.hasPlanning
              ? "border-emerald-500/30 bg-emerald-500/5"
              : validation.valid
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-rose-500/30 bg-rose-500/5",
          )}>
            {validation.valid && validation.hasPlanning ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="size-4" />
                  发现 .planning 目录
                </div>
                {validation.planningInfo?.projectName && (
                  <div className="text-xs text-slate-400">项目: {validation.planningInfo.projectName}</div>
                )}
                {validation.planningInfo?.files && (
                  <div className="text-xs text-slate-500">文件: {validation.planningInfo.files.join(", ")}</div>
                )}
                <button
                  onClick={addProject}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/30"
                >
                  <Plus className="size-3" />
                  添加此项目
                </button>
              </div>
            ) : validation.valid ? (
              <div className="text-sm text-amber-300">路径有效但未找到 .planning 目录，请确认这是 GSD 项目</div>
            ) : (
              <div className="text-sm text-rose-300">{validation.reason || "无效路径"}</div>
            )}
          </div>
        )}
      </div>

      {/* 导航按钮 */}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" />
          返回
        </button>
        <button
          onClick={onNext}
          disabled={projects.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500/20 px-4 py-2 text-sm text-sky-400 hover:bg-sky-500/30 disabled:opacity-50"
        >
          下一步
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Confirm Step ──────────────────────────────────────────────

function ConfirmStep({
  projects, saving, onBack, onSave,
}: {
  projects: ProjectConfig[];
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white">确认配置</h2>
      <p className="mt-2 text-sm text-slate-400">以下项目将被添加到 Dashboard 监控列表</p>

      <div className="mt-4 space-y-2">
        {projects.map((project, i) => (
          <div key={project.id} className="flex items-center gap-3 rounded-md border border-white/10 bg-slate-900/60 px-4 py-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">{project.name}</div>
              <div className="truncate font-mono text-xs text-slate-500">{project.path}</div>
            </div>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" />
          返回修改
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-6 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          {saving ? "保存中..." : "保存并开始使用"}
        </button>
      </div>
    </div>
  );
}
