import fs from "node:fs/promises";
import path from "node:path";
import type { SummaryItem } from "@/lib/types";
import {
  asNumber,
  asString,
  asStringArray,
  extractListItems,
  extractSection,
  firstHeading,
  normalizeStatus,
  readMarkdownFile,
} from "./frontmatter";

export async function parseSummaryFile(filePath: string, phaseNumber: number, phaseSlug: string): Promise<SummaryItem | null> {
  const parsed = await readMarkdownFile(filePath);
  if (!parsed) return null;

  const fileName = path.basename(filePath);
  const filePlanNumber = asNumber(fileName.match(/^\d+[-_](\d+)/)?.[1], 0);
  const planNumber = asNumber(parsed.data.plan, filePlanNumber);
  const stat = await fs.stat(filePath).catch(() => null);
  const keyResultsSection = extractSection(parsed.content, ["Key Results", "Results", "关键结果", "结果"]);
  const timestamp =
    asString(parsed.data.completed_at) ||
    asString(parsed.data.updated_at) ||
    asString(parsed.data.date) ||
    stat?.mtime.toISOString() ||
    null;

  return {
    id: `${phaseNumber}-${planNumber}-summary`,
    phaseNumber,
    phaseSlug,
    planNumber,
    status: normalizeStatus(parsed.data.status),
    goal: asString(parsed.data.goal, firstHeading(parsed.content) ?? `Plan ${planNumber}`),
    filesModified: asStringArray(parsed.data.files_modified),
    deviations: asStringArray(parsed.data.deviations),
    keyResults: extractListItems(keyResultsSection),
    timestamp,
    path: filePath,
    content: parsed.content,
  };
}
