export type GsdStatus =
  | "complete"
  | "completed"
  | "in_progress"
  | "ready_to_plan"
  | "planning"
  | "ready_to_execute"
  | "phase_complete"
  | "blocked"
  | "pending"
  | "unknown";

export type GsdSource = "cli" | "markdown-fallback";

export interface GsdProjectConfig {
  id: string;
  name: string;
  path: string;
  description?: string;
}

export interface ProjectMetadata {
  name: string;
  description: string;
  coreValue?: string;
  constraints: string[];
  techStack: string[];
}

export interface StateSnapshot {
  project: string;
  currentPhase: number | null;
  currentPlan: number | null;
  status: GsdStatus;
  progress: number;
  completedPlans: number;
  totalPlans: number;
  blockers: string[];
  raw: Record<string, unknown>;
}

export interface ProgressSnapshot {
  percent: number;
  completedPlans: number;
  totalPlans: number;
  label?: string;
  raw?: unknown;
}

export interface HealthSnapshot {
  status: GsdStatus;
  issues: string[];
  warnings: string[];
  raw?: unknown;
}

export interface RoadmapPhase {
  number: number;
  slug: string;
  title: string;
  status: GsdStatus;
  goal?: string;
  progress?: number;
}

export interface PlanItem {
  id: string;
  phaseNumber: number;
  phaseSlug: string;
  number: number;
  title: string;
  status: GsdStatus;
  type?: string;
  wave: number;
  dependsOn: string[];
  filesModified: string[];
  autonomous?: boolean;
  goal?: string;
  path: string;
  content: string;
  summary?: SummaryItem;
}

export interface SummaryItem {
  id: string;
  phaseNumber: number;
  phaseSlug: string;
  planNumber: number;
  status: GsdStatus;
  goal: string;
  filesModified: string[];
  deviations: string[];
  keyResults: string[];
  timestamp: string | null;
  path: string;
  content: string;
}

export interface ActivityItem {
  id: string;
  phaseNumber: number;
  phaseTitle: string;
  planNumber: number;
  title: string;
  status: GsdStatus;
  timestamp: string | null;
  path: string;
}

export interface PhaseDocument {
  kind: "context" | "research" | "uat" | "other";
  title: string;
  path: string;
  content: string;
}

export interface WaveGroup {
  wave: number;
  plans: PlanItem[];
}

export interface PhaseOverview {
  number: number;
  slug: string;
  title: string;
  status: GsdStatus;
  goal?: string;
  path: string;
  completedPlans: number;
  totalPlans: number;
  progress: number;
}

export interface PhaseDetail extends PhaseOverview {
  plans: PlanItem[];
  waves: WaveGroup[];
  documents: PhaseDocument[];
}

export interface DashboardStatus {
  source: GsdSource;
  generatedAt: string;
  activeProject: GsdProjectConfig;
  projects: GsdProjectConfig[];
  project: ProjectMetadata;
  state: StateSnapshot;
  progress: ProgressSnapshot;
  health: HealthSnapshot;
  phases: PhaseOverview[];
  blockers: string[];
  activities: ActivityItem[];
}

export interface CliPayloads {
  state?: unknown;
  roadmap?: unknown;
  progress?: unknown;
  health?: unknown;
}
