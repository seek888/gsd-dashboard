import type { ProjectMetadata, StateSnapshot } from "@/lib/types";
import {
  asNumber,
  asString,
  asStringArray,
  extractListItems,
  extractSection,
  firstParagraph,
  normalizeStatus,
  readMarkdownFile,
} from "./frontmatter";

export async function parseStateFile(filePath: string): Promise<StateSnapshot> {
  const parsed = await readMarkdownFile(filePath);
  const data = parsed?.data ?? {};
  const content = parsed?.content ?? "";
  const blockerSection = extractSection(content, ["Blockers", "阻塞项", "阻塞", "Blocked"]);
  const blockers = [...asStringArray(data.blockers), ...extractListItems(blockerSection)];

  return {
    project: asString(data.project, "GSD Project"),
    currentPhase: data.current_phase === undefined ? null : asNumber(data.current_phase, 0),
    currentPlan: data.current_plan === undefined ? null : asNumber(data.current_plan, 0),
    status: normalizeStatus(data.status),
    progress: asNumber(data.progress, 0),
    completedPlans: asNumber(data.completed_plans, 0),
    totalPlans: asNumber(data.total_plans, 0),
    blockers,
    raw: data,
  };
}

export async function parseProjectFile(filePath: string, fallbackName: string): Promise<ProjectMetadata> {
  const parsed = await readMarkdownFile(filePath);
  const data = parsed?.data ?? {};
  const content = parsed?.content ?? "";
  const coreValueSection = extractSection(content, ["Core Value", "core_value", "核心价值"]);
  const constraintsSection = extractSection(content, ["Constraints", "约束", "限制"]);
  const techStackSection = extractSection(content, ["Tech Stack", "技术栈"]);

  return {
    name: asString(data.project, asString(data.name, asString(data.title, fallbackName))),
    description: asString(data.description, firstParagraph(content) || "暂无项目描述"),
    coreValue: asString(data.core_value, firstParagraph(coreValueSection)),
    constraints: [...asStringArray(data.constraints), ...extractListItems(constraintsSection)],
    techStack: [...asStringArray(data.tech_stack), ...extractListItems(techStackSection)],
  };
}
