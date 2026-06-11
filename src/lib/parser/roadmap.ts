import type { RoadmapPhase } from "@/lib/types";
import { asNumber, normalizeStatus, slugFromName } from "./frontmatter";

export function parseRoadmap(content: string): RoadmapPhase[] {
  const listPhases = parseRoadmapListItems(content);
  const tablePhases = parseRoadmapTables(content);
  const headingPhases = parseRoadmapHeadings(content);
  const merged = new Map<number, RoadmapPhase>();

  // Priority: headings > list items > tables (headings have most detail)
  // But: don't downgrade status from "complete" to "unknown"
  for (const phase of [...tablePhases, ...listPhases, ...headingPhases]) {
    const existing = merged.get(phase.number);
    if (existing) {
      const betterStatus = existing.status !== "unknown" && phase.status === "unknown" ? existing.status : phase.status;
      merged.set(phase.number, { ...existing, ...phase, status: betterStatus });
    } else {
      merged.set(phase.number, phase);
    }
  }

  return [...merged.values()].sort((a, b) => a.number - b.number);
}

function parseRoadmapListItems(content: string): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [];
  // Match: - [x] **Phase 4: Progress & State Views** - description
  const regex = /^\s*-\s*\[[ xX]\]\s*\*\*(?:Phase\s*)?(\d{1,2})\s*[:：.]\s*(.+?)\*\*/gim;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const number = asNumber(match[1], 0);
    const rawTitle = match[2].replace(/\s*[-–—]\s*.*$/, "").trim();
    const fullLine = match[0];
    // [x] means complete, [ ] means pending
    const isChecked = /\[[xX]\]/.test(fullLine);
    phases.push({
      number,
      slug: slugFromName(rawTitle) || `phase-${number}`,
      title: rawTitle || `Phase ${number}`,
      status: isChecked ? normalizeStatus("complete") : inferStatus(fullLine),
    });
  }

  return phases;
}

function parseRoadmapHeadings(content: string): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [];
  const regex = /^#{2,4}\s*(?:Phase\s*)?(\d{1,2})[\s:：._-]+(.+)$/gim;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const number = asNumber(match[1], 0);
    const rawTitle = match[2].replace(/\s*[-–—]\s*(complete|completed|in_progress|blocked|pending|planning).*$/i, "").trim();
    phases.push({
      number,
      slug: slugFromName(rawTitle) || `phase-${number}`,
      title: rawTitle || `Phase ${number}`,
      status: inferStatus(match[2]),
    });
  }

  return phases;
}

function parseRoadmapTables(content: string): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim().startsWith("|") || !/phase|阶段|\d/i.test(line)) continue;
    if (/---/.test(line.toLowerCase()) || /phase\s*\|.*status/i.test(line.toLowerCase())) continue;

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    const joined = cells.join(" ");
    const numberMatch = joined.match(/(?:phase\s*)?(\d{1,2})/i);
    if (!numberMatch) continue;

    const number = asNumber(numberMatch[1], 0);
    const titleCell = cells.find((cell) => /[a-z\u4e00-\u9fa5]/i.test(cell) && !/complete|progress|status|阶段|phase\s*\d/i.test(cell));
    const title = titleCell?.replace(/^Phase\s*\d+[\s:：._-]*/i, "").trim() || `Phase ${number}`;
    const progressMatch = joined.match(/(\d{1,3})\s*%/);

    phases.push({
      number,
      slug: slugFromName(title) || `phase-${number}`,
      title,
      status: inferStatus(joined),
      progress: progressMatch ? Math.min(100, asNumber(progressMatch[1], 0)) : undefined,
    });
  }

  return phases;
}

function inferStatus(text: string) {
  if (/✅|complete|completed|done|已完成|完成/i.test(text)) return normalizeStatus("complete");
  if (/🔄|in[_ -]?progress|进行中|执行中/i.test(text)) return normalizeStatus("in_progress");
  if (/❌|blocked|阻塞/i.test(text)) return normalizeStatus("blocked");
  if (/⏳|pending|waiting|待|未开始/i.test(text)) return normalizeStatus("pending");
  return normalizeStatus("unknown");
}
