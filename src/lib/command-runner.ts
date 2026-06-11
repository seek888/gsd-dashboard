import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { getConfiguredProjects } from "./gsd-bridge";
import { GSD_COMMANDS } from "./command-types";
import type { GsdCommandId } from "./command-types";

const execFileAsync = promisify(execFile);
const CLI_PATH = path.join(os.homedir(), ".cursor/get-shit-done/bin/gsd-tools.cjs");

// ── Types ──────────────────────────────────────────────────────

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  command: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  command: GsdCommandId;
  args: string[];
  projectId: string;
  result: "success" | "failure" | "cancelled";
  timestamp: string;
  durationMs: number;
  stdout?: string;
  stderr?: string;
}

// ── Command Execution ──────────────────────────────────────────

export async function executeGsdCommand(
  commandId: GsdCommandId,
  projectId: string,
  extraArgs: string[] = [],
): Promise<CommandResult> {
  const cmd = GSD_COMMANDS.find((c) => c.id === commandId);
  if (!cmd) throw new Error(`Unknown command: ${commandId}`);

  const projects = await getConfiguredProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);

  const start = Date.now();
  const fullArgs = [...cmd.args, ...extraArgs];

  try {
    const result = await execFileAsync("node", [CLI_PATH, ...fullArgs], {
      cwd: project.path,
      timeout: 30_000,
      maxBuffer: 1024 * 1024 * 8,
    });

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      durationMs: Date.now() - start,
      command: `gsd-tools ${fullArgs.join(" ")}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; code?: string };
    return {
      success: false,
      stdout: execErr.stdout || "",
      stderr: execErr.stderr || String(err),
      exitCode: execErr.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" ? -1 : 1,
      durationMs: Date.now() - start,
      command: `gsd-tools ${fullArgs.join(" ")}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Audit Log ──────────────────────────────────────────────────

const AUDIT_LOG_MAX = 100;

export async function appendAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<AuditLogEntry> {
  const log: AuditLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  const logPath = getAuditLogPath();
  const existing = await readAuditLog();
  existing.unshift(log);
  if (existing.length > AUDIT_LOG_MAX) existing.length = AUDIT_LOG_MAX;

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, JSON.stringify(existing, null, 2));

  return log;
}

export async function readAuditLog(): Promise<AuditLogEntry[]> {
  const logPath = getAuditLogPath();
  try {
    const content = await fs.readFile(logPath, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function getAuditLogPath(): string {
  return path.join(os.homedir(), ".openclaw", "workspace", "gsd-dashboard-audit.json");
}
