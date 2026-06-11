import path from "node:path";
import type { PlanItem, SummaryItem } from "@/lib/types";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  firstHeading,
  normalizeStatus,
  readMarkdownFile,
  slugFromName,
} from "./frontmatter";

export async function parsePlanFile(filePath: string, phaseNumber: number, phaseSlug: string): Promise<PlanItem | null> {
  const parsed = await readMarkdownFile(filePath);
  if (!parsed) return null;

  const fileName = path.basename(filePath);
  const filePlanNumber = asNumber(fileName.match(/^\d+[-_](\d+)/)?.[1], 0);
  const planNumber = asNumber(parsed.data.plan, filePlanNumber);
  const title = asString(parsed.data.title, asString(parsed.data.goal, firstHeading(parsed.content) ?? `Plan ${planNumber}`));

  return {
    id: `${phaseNumber}-${planNumber}`,
    phaseNumber,
    phaseSlug,
    number: planNumber,
    title,
    status: normalizeStatus(parsed.data.status),
    type: asString(parsed.data.type, undefined),
    wave: Math.max(1, asNumber(parsed.data.wave, 1)),
    dependsOn: asStringArray(parsed.data.depends_on),
    filesModified: asStringArray(parsed.data.files_modified),
    autonomous: asBoolean(parsed.data.autonomous),
    goal: asString(parsed.data.goal, ""),
    path: filePath,
    content: parsed.content,
  };
}

export function attachSummaries(plans: PlanItem[], summaries: SummaryItem[]): PlanItem[] {
  const byPlan = new Map(summaries.map((summary) => [summary.planNumber, summary]));

  return plans
    .map((plan) => {
      const summary = byPlan.get(plan.number);
      let status = plan.status;
      if (summary) {
        // Explicit status from summary frontmatter
        if (summary.status === "complete" || summary.status === "completed") {
          status = "complete";
        } else if (summary.status === "unknown") {
          // Infer from content: check for completion markers like ✅
          const content = summary.content ?? "";
          if (/✅|完成|completed|done|成功/i.test(content) && !/❌|失败|failed/i.test(content)) {
            status = "complete";
          }
        }
      }
      return {
        ...plan,
        status,
        summary,
      };
    })
    .sort((a, b) => a.wave - b.wave || a.number - b.number);
}

export function phaseSlugFromDirectory(directoryName: string): { number: number; slug: string } {
  const number = asNumber(directoryName.match(/^(\d{1,2})/)?.[1], 0);
  return {
    number,
    slug: slugFromName(directoryName) || `phase-${number}`,
  };
}
