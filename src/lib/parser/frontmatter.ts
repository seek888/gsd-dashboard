import fs from "node:fs/promises";
import matter from "gray-matter";

export interface ParsedMarkdown<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T;
  content: string;
  excerpt?: string;
}

export async function readMarkdownFile<T extends Record<string, unknown> = Record<string, unknown>>(
  filePath: string,
): Promise<ParsedMarkdown<T> | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseMarkdown<T>(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    // YAML parse error or other — treat as empty
    console.warn(`[gsd] Failed to parse ${filePath}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export function parseMarkdown<T extends Record<string, unknown> = Record<string, unknown>>(
  raw: string,
): ParsedMarkdown<T> {
  try {
    const parsed = matter(raw, { excerpt: true });
    return {
      data: parsed.data as T,
      content: parsed.content.trim(),
      excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt.trim() : undefined,
    };
  } catch (err) {
    // YAML parse error — fall back to treating the whole file as content
    const content = raw.replace(/^---[\s\S]*?---\s*/, "").trim();
    return {
      data: {} as T,
      content,
    };
  }
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace("%", ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["true", "yes", "1"].includes(value.toLowerCase())) return true;
    if (["false", "no", "0"].includes(value.toLowerCase())) return false;
  }
  return undefined;
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }

  return [];
}

export function firstHeading(content: string): string | null {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

export function firstParagraph(content: string): string {
  const paragraph = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#") && !block.startsWith("|"));

  return paragraph?.replace(/\s+/g, " ") ?? "";
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeStatus(value: unknown): import("@/lib/types").GsdStatus {
  const text = asString(value, "unknown").toLowerCase().trim();

  if (["done", "complete", "completed", "success", "finished"].includes(text)) return "complete";
  if (["in progress", "in-progress", "active", "doing", "running"].includes(text)) return "in_progress";
  if (["blocked", "blocker", "failed", "error"].includes(text)) return "blocked";
  if (["todo", "waiting", "wait", "pending", "not_started", "not started"].includes(text)) return "pending";
  if (["ready_to_plan", "planning", "ready_to_execute", "phase_complete"].includes(text)) {
    return text as import("@/lib/types").GsdStatus;
  }

  return "unknown";
}

export function extractSection(content: string, headingNames: string[]): string {
  const headingPattern = headingNames.map(escapeRegExp).join("|");
  const regex = new RegExp(`^#{1,6}\\s*(?:${headingPattern})\\s*$([\\s\\S]*?)(?=^#{1,6}\\s+|(?![\\s\\S]))`, "im");
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}

export function extractListItems(block: string): string[] {
  return block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*+]\s+|\d+\.\s+|\[[ xX]\]\s+/.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "").replace(/^\[[ xX]\]\s+/, "").trim())
    .filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
