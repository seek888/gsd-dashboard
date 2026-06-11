// ── Blocker Detection & Alerting ──────────────────────────────

import type { DashboardStatus } from "./types";

export interface BlockerAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "stale-phase" | "no-plans" | "parse-error" | "health-issue" | "incomplete-milestone";
  message: string;
  phase?: number;
  suggestion?: string;
  detectedAt: number;
}

/**
 * Scan dashboard status for potential blockers
 */
export function detectBlockers(status: DashboardStatus): BlockerAlert[] {
  const alerts: BlockerAlert[] = [];
  const now = Date.now();

  // 1. Check for incomplete phases with no plans
  for (const phase of status.phases) {
    if (phase.status === "in_progress" && phase.totalPlans === 0) {
      alerts.push({
        id: `no-plans-${phase.number}`,
        severity: "warning",
        category: "no-plans",
        message: `Phase ${phase.number} "${phase.title}" 标记为进行中但无任何 Plan`,
        phase: phase.number,
        suggestion: "检查 .planning/phases/ 目录是否缺少 Plan 文件",
        detectedAt: now,
      });
    }
  }

  // 2. Check for health issues
  const healthIssues = status.health?.issues || [];
  const healthWarnings = status.health?.warnings || [];
  if (healthIssues.length > 0 || healthWarnings.length > 0) {
    for (const issue of healthIssues) {
      alerts.push({
        id: `health-${alerts.length}`,
        severity: "warning",
        category: "health-issue",
        message: typeof issue === "string" ? issue : String(issue),
        detectedAt: now,
      });
    }
    for (const warn of healthWarnings) {
      alerts.push({
        id: `health-warn-${alerts.length}`,
        severity: "info",
        category: "health-issue",
        message: typeof warn === "string" ? warn : String(warn),
        detectedAt: now,
      });
    }
  }

  // 3. Check for stale phases (in-progress but no recent activity)
  for (const phase of status.phases) {
    if (phase.status === "in_progress" && phase.completedPlans < phase.totalPlans) {
      const remaining = phase.totalPlans - phase.completedPlans;
      if (remaining > 3) {
        alerts.push({
          id: `stale-${phase.number}`,
          severity: "info",
          category: "stale-phase",
          message: `Phase ${phase.number} 还有 ${remaining} 个 Plan 未完成`,
          phase: phase.number,
          suggestion: "考虑拆分为更小的 Wave 或调整优先级",
          detectedAt: now,
        });
      }
    }
  }

  // 4. Check for overall completion with remaining issues
  if (status.state.status === "completed") {
    const incompletePhases = status.phases.filter((p) => p.status !== "complete");
    if (incompletePhases.length > 0) {
      alerts.push({
        id: "milestone-mismatch",
        severity: "info",
        category: "incomplete-milestone",
        message: `里程碑标记为完成但有 ${incompletePhases.length} 个 Phase 未完成`,
        suggestion: "确认里程碑状态是否正确",
        detectedAt: now,
      });
    }
  }

  return alerts;
}

/**
 * Wave auto-advance: detect if all plans in current wave are complete
 */
export function detectWaveCompletion(status: DashboardStatus): { phase: number; wave: number; canAdvance: boolean } | null {
  // Find the first in-progress phase
  const activePhase = status.phases.find((p) => p.status === "in_progress");
  if (!activePhase) return null;

  // Check if all plans are completed
  if (activePhase.totalPlans > 0 && activePhase.completedPlans === activePhase.totalPlans) {
    return {
      phase: activePhase.number,
      wave: 1, // simplified - would need wave-level tracking
      canAdvance: true,
    };
  }

  return null;
}
