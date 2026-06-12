import type { GsdStatus, DashboardStatus } from "./types";
import type { GsdCommandId } from "./command-types";

// ── Next Step Suggestion ──────────────────────────────────────

export interface NextStepSuggestion {
  /** 唯一标识 */
  id: string;
  /** 操作标题 */
  title: string;
  /** 详细说明 */
  description: string;
  /** 对应的 GSD 命令 */
  commandId: GsdCommandId;
  /** 命令参数 */
  args: string[];
  /** 优先级：1=最高 */
  priority: number;
  /** 图标颜色 */
  tone: "blue" | "green" | "amber" | "rose" | "slate";
  /** 操作类别 */
  category: "execute" | "review" | "advance" | "resolve" | "complete";
}

/**
 * 根据项目当前状态，推荐下一步操作
 */
export function suggestNextSteps(status: DashboardStatus): NextStepSuggestion[] {
  const suggestions: NextStepSuggestion[] = [];
  const { state, phases, blockers } = status;
  const currentPhase = phases.find(
    (p) => p.number === state.currentPhase || p.status === "in_progress",
  );

  // 1. 有阻塞项 → 优先解决
  if (blockers.length > 0) {
    suggestions.push({
      id: "resolve-blockers",
      title: "解决阻塞项",
      description: `当前有 ${blockers.length} 个阻塞项需要处理`,
      commandId: "health",
      args: [],
      priority: 1,
      tone: "rose",
      category: "resolve",
    });
    return suggestions; // 有阻塞时只显示解决阻塞
  }

  // 2. 根据项目状态推荐
  switch (state.status) {
    case "ready_to_plan":
    case "planning":
      suggestions.push({
        id: "generate-plan",
        title: "生成 Plan",
        description: currentPhase
          ? `Phase ${currentPhase.number} "${currentPhase.title}" 需要生成执行计划`
          : "当前 Phase 需要生成执行计划",
        commandId: "execute-phase",
        args: currentPhase ? [String(currentPhase.number)] : [],
        priority: 1,
        tone: "blue",
        category: "execute",
      });
      break;

    case "ready_to_execute":
    case "in_progress": {
      // 检查是否在某个 Phase 中
      if (currentPhase) {
        // Phase 未完成
        if (currentPhase.completedPlans < currentPhase.totalPlans) {
          const nextPlanNum = currentPhase.completedPlans + 1;
          suggestions.push({
            id: "execute-next-plan",
            title: `执行 Plan ${nextPlanNum}`,
            description: `Phase ${currentPhase.number} 中下一个待执行的 Plan`,
            commandId: "execute-plan",
            args: [String(currentPhase.number), String(nextPlanNum)],
            priority: 1,
            tone: "green",
            category: "execute",
          });

          // 同时建议查看状态
          suggestions.push({
            id: "check-progress",
            title: "查看当前进度",
            description: "查看 Phase 执行进度和待办事项",
            commandId: "progress",
            args: [],
            priority: 3,
            tone: "slate",
            category: "review",
          });
        } else {
          // 所有 Plan 完成
          suggestions.push({
            id: "verify-phase",
            title: "验证 Phase 完成",
            description: `Phase ${currentPhase.number} 的所有 Plan 已执行，验证工作成果`,
            commandId: "verify-work",
            args: [],
            priority: 1,
            tone: "amber",
            category: "review",
          });
        }
      }
      break;
    }

    case "phase_complete": {
      // 找到下一个 Phase
      const nextPhase = phases.find(
        (p) => p.status === "pending" || p.status === "ready_to_plan" || p.status === "unknown",
      );
      if (nextPhase) {
        suggestions.push({
          id: "advance-phase",
          title: `进入 Phase ${nextPhase.number}`,
          description: `开始 "${nextPhase.title}"`,
          commandId: "execute-phase",
          args: [String(nextPhase.number)],
          priority: 1,
          tone: "blue",
          category: "advance",
        });
      }
      break;
    }

    case "completed":
      suggestions.push({
        id: "project-complete",
        title: "项目已完成 🎉",
        description: "所有 Phase 和 Plan 已完成",
        commandId: "health",
        args: [],
        priority: 1,
        tone: "green",
        category: "complete",
      });
      break;

    default:
      // 未知状态 → 建议检查健康
      suggestions.push({
        id: "check-health",
        title: "检查项目状态",
        description: "当前状态不明确，建议运行健康检查",
        commandId: "health",
        args: [],
        priority: 1,
        tone: "slate",
        category: "review",
      });
      break;
  }

  // 3. 总是附加健康检查作为低优先级选项
  if (suggestions.every((s) => s.id !== "check-health") && suggestions.length > 0) {
    suggestions.push({
      id: "health-check",
      title: "健康检查",
      description: "检查项目整体健康状态",
      commandId: "health",
      args: [],
      priority: 5,
      tone: "slate",
      category: "review",
    });
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

/**
 * 获取最高优先级的建议（即「下一步」）
 */
export function getPrimaryNextStep(status: DashboardStatus): NextStepSuggestion | null {
  const steps = suggestNextSteps(status);
  return steps.length > 0 ? steps[0] : null;
}
