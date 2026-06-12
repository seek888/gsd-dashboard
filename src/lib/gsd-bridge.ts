import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type {
  ActivityItem,
  CliPayloads,
  DashboardStatus,
  GsdProjectConfig,
  HealthSnapshot,
  PhaseDetail,
  PhaseDocument,
  PhaseOverview,
  PlanItem,
  ProgressSnapshot,
  RoadmapPhase,
  StateSnapshot,
  SummaryItem,
  WaveGroup,
} from "@/lib/types";
import { asNumber, asString, firstHeading, normalizeStatus, readMarkdownFile, slugFromName } from "./parser/frontmatter";
import { attachSummaries, parsePlanFile, phaseSlugFromDirectory } from "./parser/plan";
import { parseRoadmap } from "./parser/roadmap";
import { parseProjectFile, parseStateFile } from "./parser/state";
import { parseSummaryFile } from "./parser/summary";

const execFileAsync = promisify(execFile);
const CLI_PATH = path.join(os.homedir(), ".cursor/get-shit-done/bin/gsd-tools.cjs");

export async function getDashboardStatus(projectId?: string): Promise<DashboardStatus> {
  const projects = await getConfiguredProjects();
  const activeProject = projects.find((project) => project.id === projectId) ?? projects[0];
  const cliPayloads = await tryReadCliPayloads(activeProject.path);

  if (cliPayloads) {
    const fallback = await readMarkdownProject(activeProject, projects);
    return mergeCliWithFallback(cliPayloads, fallback);
  }

  return readMarkdownProject(activeProject, projects);
}

export async function getPhaseDetail(phaseNumber: number, projectId?: string): Promise<PhaseDetail | null> {
  const status = await getDashboardStatus(projectId);
  const phase = status.phases.find((item) => item.number === phaseNumber);
  if (!phase) return null;

  const detail = await readPhaseDetail(status.activeProject.path, phase);
  return detail;
}

export async function getConfiguredProjects(): Promise<GsdProjectConfig[]> {
  const rawProjects = process.env.GSD_PROJECTS;
  const root = process.env.GSD_PROJECT_ROOT || process.cwd();

  if (rawProjects) {
    const parsed = parseProjectsEnv(rawProjects);
    if (parsed.length > 0) return hydrateProjectNames(parsed);
  }

  return hydrateProjectNames([
    {
      id: "default",
      name: path.basename(root),
      path: root,
    },
  ]);
}

async function hydrateProjectNames(projects: GsdProjectConfig[]): Promise<GsdProjectConfig[]> {
  return Promise.all(
    projects.map(async (project, index) => {
      const absolutePath = path.resolve(project.path);
      const config = await readPlanningConfig(absolutePath);
      const name = project.name || asString(config.name, asString(config.project, path.basename(absolutePath)));

      return {
        id: project.id || slugFromName(name) || `project-${index + 1}`,
        name,
        path: absolutePath,
        description: project.description || asString(config.description),
      };
    }),
  );
}

function parseProjectsEnv(raw: string): GsdProjectConfig[] {
  try {
    const parsed = JSON.parse(raw) as Array<Partial<GsdProjectConfig> | string>;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => {
          if (typeof item === "string") {
            return { id: `project-${index + 1}`, name: path.basename(item), path: item };
          }

          return {
            id: item.id || slugFromName(item.name || item.path || `project-${index + 1}`),
            name: item.name || path.basename(item.path || `project-${index + 1}`),
            path: item.path || process.cwd(),
            description: item.description,
          };
        })
        .filter((item) => Boolean(item.path));
    }
  } catch {
    // 环境变量也支持逗号分隔路径，便于本地快速配置。
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => ({
      id: `project-${index + 1}`,
      name: path.basename(item),
      path: item,
    }));
}

async function tryReadCliPayloads(projectRoot: string): Promise<CliPayloads | null> {
  const exists = await fs
    .access(CLI_PATH)
    .then(() => true)
    .catch(() => false);

  if (!exists) return null;

  const commands = {
    state: ["state", "json"],
    roadmap: ["roadmap", "analyze"],
    progress: ["progress", "json"],
    health: ["validate", "health"],
  } satisfies Record<keyof CliPayloads, string[]>;

  const entries = await Promise.all(
    Object.entries(commands).map(async ([key, command]) => {
      const value = await runCliJson(command, projectRoot).catch(() => undefined);
      return [key, value] as const;
    }),
  );
  const payloads = Object.fromEntries(entries) as CliPayloads;

  return payloads.state || payloads.roadmap || payloads.progress || payloads.health ? payloads : null;
}

async function runCliJson(command: string[], projectRoot: string): Promise<unknown> {
  const withRoot = await execFileAsync("node", [CLI_PATH, ...command, "--project-root", projectRoot], {
    timeout: 10_000,
    maxBuffer: 1024 * 1024 * 8,
  }).catch(async () =>
    execFileAsync("node", [CLI_PATH, ...command], {
      cwd: projectRoot,
      timeout: 10_000,
      maxBuffer: 1024 * 1024 * 8,
    }),
  );

  return parseJsonFromStdout(withRoot.stdout);
}

function parseJsonFromStdout(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("CLI output is not JSON");
    return JSON.parse(match[0]);
  }
}

async function readMarkdownProject(activeProject: GsdProjectConfig, projects: GsdProjectConfig[]): Promise<DashboardStatus> {
  const planningRoot = path.join(activeProject.path, ".planning");
  const [project, state, roadmapContent, phases] = await Promise.all([
    parseProjectFile(path.join(planningRoot, "PROJECT.md"), activeProject.name),
    parseStateFile(path.join(planningRoot, "STATE.md")),
    fs.readFile(path.join(planningRoot, "ROADMAP.md"), "utf8").catch(() => ""),
    readAllPhases(activeProject.path),
  ]);
  const roadmap = parseRoadmap(roadmapContent);
  const mergedPhases = mergeRoadmapWithPhases(roadmap, phases);
  // Only count phases that have detailed plan data (totalPlans >= 0)
  const phasesWithData = mergedPhases.filter((p) => p.totalPlans >= 0);
  // For phases without data but marked complete, count them as fully done
  const phasesCompleteNoData = mergedPhases.filter((p) => p.totalPlans < 0 && p.status === "complete");
  const totalPhases = mergedPhases.length;
  const completedPhases = mergedPhases.filter((p) => p.status === "complete" || p.status === "completed" || p.status === "phase_complete").length;

  const planCompleted = phasesWithData.reduce((sum, p) => sum + Math.max(0, p.completedPlans), 0);
  const planTotal = phasesWithData.reduce((sum, p) => sum + Math.max(0, p.totalPlans), 0);

  // Overall progress: weighted blend of plan-level and phase-level completion
  let overallPercent: number;
  if (planTotal > 0) {
    overallPercent = Math.round((planCompleted / planTotal) * 100);
  } else if (totalPhases > 0) {
    overallPercent = Math.round((completedPhases / totalPhases) * 100);
  } else {
    overallPercent = 0;
  }
  const progress: ProgressSnapshot = {
    percent: overallPercent,
    completedPlans: planCompleted,
    totalPlans: planTotal,
    label: undefined,
  };

  return {
    source: "markdown-fallback",
    generatedAt: new Date().toISOString(),
    activeProject: {
      ...activeProject,
      description: activeProject.description || project.description,
    },
    projects,
    project,
    state: {
      ...state,
      progress: progress.percent,
      completedPlans: progress.completedPlans,
      totalPlans: progress.totalPlans,
    },
    progress,
    health: {
      status: state.blockers.length > 0 ? "blocked" : "unknown",
      issues: state.blockers,
      warnings: [],
    },
    phases: mergedPhases,
    blockers: state.blockers,
    activities: buildActivities(mergedPhases, await readAllSummaries(activeProject.path)),
  };
}

function mergeCliWithFallback(cliPayloads: CliPayloads, fallback: DashboardStatus): DashboardStatus {
  const state = normalizeState(cliPayloads.state, fallback.state);
  // Use fallback progress as base — CLI milestone data may have 0/0 when
  // the real plan data was correctly parsed from markdown
  const cliProgress = normalizeProgress(cliPayloads.progress, state, fallback.progress.completedPlans, fallback.progress.totalPlans);
  const progress: ProgressSnapshot = {
    percent: cliProgress.totalPlans > 0
      ? cliProgress.percent
      : fallback.progress.percent,
    completedPlans: cliProgress.totalPlans > 0
      ? cliProgress.completedPlans
      : fallback.progress.completedPlans,
    totalPlans: cliProgress.totalPlans > 0
      ? cliProgress.totalPlans
      : fallback.progress.totalPlans,
    label: cliProgress.label ?? fallback.progress.label,
    raw: cliProgress.raw,
  };

  return {
    ...fallback,
    source: "cli",
    generatedAt: new Date().toISOString(),
    state: {
      ...state,
      progress: progress.percent,
      completedPlans: progress.completedPlans,
      totalPlans: progress.totalPlans,
    },
    progress,
    health: normalizeHealth(cliPayloads.health, fallback.health),
    blockers: state.blockers.length > 0 ? state.blockers : fallback.blockers,
  };
}

function normalizeState(payload: unknown, fallback: StateSnapshot): StateSnapshot {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;

  return {
    project: asString(record.project, fallback.project),
    currentPhase: record.current_phase === undefined ? fallback.currentPhase : asNumber(record.current_phase, 0),
    currentPlan: record.current_plan === undefined ? fallback.currentPlan : asNumber(record.current_plan, 0),
    status: normalizeStatus(record.status ?? fallback.status),
    progress: asNumber(record.progress, fallback.progress),
    completedPlans: asNumber(record.completed_plans ?? record.completedPlans, fallback.completedPlans),
    totalPlans: asNumber(record.total_plans ?? record.totalPlans, fallback.totalPlans),
    blockers: Array.isArray(record.blockers) ? record.blockers.map(String) : fallback.blockers,
    raw: record,
  };
}

function normalizeProgress(payload: unknown, state: StateSnapshot, fallbackCompleted: number, fallbackTotal: number): ProgressSnapshot {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const completedPlans = asNumber(record.completed_plans ?? record.completedPlans, state.completedPlans || fallbackCompleted);
  const totalPlans = asNumber(record.total_plans ?? record.totalPlans, state.totalPlans || fallbackTotal);
  const percent =
    asNumber(record.progress ?? record.percent ?? record.percentage, Number.NaN) ||
    state.progress ||
    (totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0);

  return {
    percent: Math.max(0, Math.min(100, percent)),
    completedPlans,
    totalPlans,
    label: asString(record.label, undefined),
    raw: payload,
  };
}

function normalizeHealth(payload: unknown, fallback: HealthSnapshot): HealthSnapshot {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;

  return {
    status: normalizeStatus(record.status ?? record.health ?? fallback.status),
    issues: arrayOfStrings(record.issues ?? record.errors ?? fallback.issues),
    warnings: arrayOfStrings(record.warnings ?? fallback.warnings),
    raw: payload,
  };
}

async function readPlanningConfig(projectRoot: string): Promise<Record<string, unknown>> {
  const configPath = path.join(projectRoot, ".planning", "config.json");

  try {
    return JSON.parse(await fs.readFile(configPath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function readAllPhases(projectRoot: string): Promise<PhaseDetail[]> {
  const phasesRoot = path.join(projectRoot, ".planning", "phases");
  const entries = await fs
    .readdir(phasesRoot, { withFileTypes: true })
    .catch(() => []);

  const phases = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const { number, slug } = phaseSlugFromDirectory(entry.name);
        const overview: PhaseOverview = {
          number,
          slug,
          title: humanizePhaseTitle(entry.name),
          status: "unknown",
          path: path.join(phasesRoot, entry.name),
          completedPlans: 0,
          totalPlans: 0,
          progress: 0,
        };
        return readPhaseDetail(projectRoot, overview);
      }),
  );

  return phases.filter((phase): phase is PhaseDetail => Boolean(phase)).sort((a, b) => a.number - b.number);
}

async function readPhaseDetail(projectRoot: string, overview: PhaseOverview): Promise<PhaseDetail | null> {
  const phasePath = overview.path;

  // Phase 没有文件系统目录（来自 ROADMAP 但没有实际 phase 文件夹）
  // 仍然返回基本详情页，使用 ROADMAP 中的数据
  if (!phasePath) {
    return {
      ...overview,
      plans: [],
      waves: [],
      documents: [],
      completedPlans: 0,
      totalPlans: 0,
      progress: overview.status === "complete" ? 100 : 0,
    };
  }

  const entries = await fs.readdir(phasePath, { withFileTypes: true }).catch(() => []);
  if (entries.length === 0) return null;

  const planFiles = entries
    .filter((entry) => entry.isFile() && /PLAN\.md$/i.test(entry.name))
    .map((entry) => path.join(phasePath, entry.name));
  const summaryFiles = entries
    .filter((entry) => entry.isFile() && /SUMMARY\.md$/i.test(entry.name))
    .map((entry) => path.join(phasePath, entry.name));

  const [rawPlans, summaries, documents] = await Promise.all([
    Promise.all(planFiles.map((file) => parsePlanFile(file, overview.number, overview.slug))),
    Promise.all(summaryFiles.map((file) => parseSummaryFile(file, overview.number, overview.slug))),
    readPhaseDocuments(phasePath),
  ]);
  const summaryItems = summaries.filter((summary): summary is SummaryItem => Boolean(summary));
  const plans = attachSummaries(
    rawPlans.filter((plan): plan is PlanItem => Boolean(plan)),
    summaryItems,
  );
  const completedPlans = plans.filter((plan) => plan.status === "complete" || plan.status === "completed").length;
  const totalPlans = plans.length;
  const progress = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : overview.progress;
  const contextTitle = documents.find((doc) => doc.kind === "context")?.content;

  return {
    ...overview,
    title: overview.title || firstHeading(contextTitle ?? "") || `Phase ${overview.number}`,
    status: inferPhaseStatus(plans, overview.status),
    completedPlans,
    totalPlans,
    progress,
    plans,
    waves: groupPlansByWave(plans),
    documents,
  };
}

async function readAllSummaries(projectRoot: string): Promise<SummaryItem[]> {
  const phases = await readAllPhases(projectRoot);
  return phases.flatMap((phase) => phase.plans.map((plan) => plan.summary).filter((summary): summary is SummaryItem => Boolean(summary)));
}

async function readPhaseDocuments(phasePath: string): Promise<PhaseDocument[]> {
  const entries = await fs.readdir(phasePath, { withFileTypes: true }).catch(() => []);
  const documentFiles = entries
    .filter((entry) => entry.isFile() && /(CONTEXT|RESEARCH|UAT)\.md$/i.test(entry.name))
    .map((entry) => path.join(phasePath, entry.name));

  const documents = await Promise.all(
    documentFiles.map(async (file) => {
      const parsed = await readMarkdownFile(file);
      const basename = path.basename(file);
      const kind = /CONTEXT/i.test(basename) ? "context" : /RESEARCH/i.test(basename) ? "research" : /UAT/i.test(basename) ? "uat" : "other";

      return {
        kind,
        title: firstHeading(parsed?.content ?? "") || basename.replace(/\.md$/i, ""),
        path: file,
        content: parsed?.content ?? "",
      } satisfies PhaseDocument;
    }),
  );

  return documents.sort((a, b) => documentOrder(a.kind) - documentOrder(b.kind));
}

function mergeRoadmapWithPhases(roadmap: RoadmapPhase[], phaseDetails: PhaseDetail[]): PhaseOverview[] {
  const byNumber = new Map(phaseDetails.map((phase) => [phase.number, phase]));
  const numbers = new Set([...roadmap.map((phase) => phase.number), ...phaseDetails.map((phase) => phase.number)]);

  return [...numbers]
    .sort((a, b) => a - b)
    .map((number) => {
      const roadmapPhase = roadmap.find((phase) => phase.number === number);
      const detail = byNumber.get(number);
      const hasDetail = Boolean(detail && detail.totalPlans > 0);
      const completedPlans = hasDetail ? detail!.completedPlans : -1;
      const totalPlans = hasDetail ? detail!.totalPlans : -1;

      return {
        number,
        slug: detail?.slug || roadmapPhase?.slug || `phase-${number}`,
        title: roadmapPhase?.title || detail?.title || `Phase ${number}`,
        status: detail ? inferPhaseStatus(detail.plans, roadmapPhase?.status ?? detail.status) : roadmapPhase?.status ?? "unknown",
        goal: roadmapPhase?.goal || detail?.goal,
        path: detail?.path || "",
        completedPlans,
        totalPlans,
        progress: roadmapPhase?.progress ?? (totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : roadmapPhase?.status === "complete" ? 100 : 0),
      };
    });
}

function buildActivities(phases: PhaseOverview[], summaries: SummaryItem[]): ActivityItem[] {
  const phaseTitles = new Map(phases.map((phase) => [phase.number, phase.title]));

  return summaries
    .map((summary) => ({
      id: summary.id,
      phaseNumber: summary.phaseNumber,
      phaseTitle: phaseTitles.get(summary.phaseNumber) || `Phase ${summary.phaseNumber}`,
      planNumber: summary.planNumber,
      title: summary.goal || `Plan ${summary.planNumber}`,
      status: summary.status,
      timestamp: summary.timestamp,
      path: summary.path,
    }))
    .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
    .slice(0, 10);
}

function groupPlansByWave(plans: PlanItem[]): WaveGroup[] {
  const groups = new Map<number, PlanItem[]>();
  for (const plan of plans) {
    groups.set(plan.wave, [...(groups.get(plan.wave) ?? []), plan]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([wave, groupPlans]) => ({ wave, plans: groupPlans.sort((a, b) => a.number - b.number) }));
}

function inferPhaseStatus(plans: PlanItem[], fallback: PhaseOverview["status"]): PhaseOverview["status"] {
  if (plans.length === 0) return fallback;
  if (plans.some((plan) => plan.status === "blocked")) return "blocked";
  if (plans.every((plan) => plan.status === "complete" || plan.status === "completed")) return "complete";
  if (plans.some((plan) => plan.status === "in_progress")) return "in_progress";
  return fallback === "unknown" ? "pending" : fallback;
}

function humanizePhaseTitle(directoryName: string): string {
  return directoryName
    .replace(/^\d+[-_\s]*/, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return String(obj.message ?? obj.msg ?? obj.error ?? JSON.stringify(item));
      }
      return String(item);
    })
    .filter(Boolean);
}

function documentOrder(kind: PhaseDocument["kind"]): number {
  return { context: 1, research: 2, uat: 3, other: 4 }[kind];
}
