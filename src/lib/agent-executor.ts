import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { appendAuditLog } from "./command-runner";
import { GSD_COMMANDS, type GsdCommandId } from "./command-types";
import { getConfiguredProjects } from "./gsd-bridge";

const CLI_PATH = path.join(os.homedir(), ".cursor/get-shit-done/bin/gsd-tools.cjs");
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_LOGS_PER_EXECUTION = 2000;

export type AgentExecutionStatus = "pending" | "running" | "completed" | "failed" | "stopped";
export type AgentLogLevel = "info" | "warn" | "error" | "success" | "system";

export interface AgentExecutionLog {
  id: string;
  timestamp: number;
  level: AgentLogLevel;
  message: string;
  source?: "stdout" | "stderr" | "system";
}

export type AgentExecutionEvent =
  | { type: "log"; executionId: string; log: AgentExecutionLog }
  | { type: "status_change"; executionId: string; status: AgentExecutionStatus; timestamp: number }
  | { type: "completed"; executionId: string; status: "completed" | "failed" | "stopped"; exitCode: number | null; durationMs: number; timestamp: number }
  | { type: "error"; executionId: string; message: string; timestamp: number };

export interface StartExecutionConfig {
  command: string;
  projectId: string;
  args?: string[];
  confirmed?: boolean;
  timeoutMs?: number;
  triggeredBy?: string;
}

export interface AgentExecutionSnapshot {
  executionId: string;
  projectId: string;
  projectPath: string;
  commandId: GsdCommandId;
  command: string;
  args: string[];
  status: AgentExecutionStatus;
  pid: number | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number;
  exitCode: number | null;
  logs: AgentExecutionLog[];
  error?: string;
}

interface AgentExecutionRecord extends Omit<AgentExecutionSnapshot, "logs"> {
  child: ChildProcess | null;
  startedAtMs: number | null;
  timeout: ReturnType<typeof setTimeout> | null;
  stdout: string;
  stderr: string;
  logs: AgentExecutionLog[];
  listeners: Set<(event: AgentExecutionEvent) => void>;
}

interface AgentExecutorStore {
  executions: Map<string, AgentExecutionRecord>;
  activeByProject: Map<string, string>;
}

const globalStore = globalThis as typeof globalThis & {
  __gsdAgentExecutorStore?: AgentExecutorStore;
};

const store: AgentExecutorStore =
  globalStore.__gsdAgentExecutorStore ??
  (globalStore.__gsdAgentExecutorStore = {
    executions: new Map(),
    activeByProject: new Map(),
  });

export async function startExecution(config: StartExecutionConfig): Promise<AgentExecutionSnapshot> {
  const resolved = resolveCommand(config.command, config.args ?? []);
  if (resolved.definition.isWrite && !config.confirmed) {
    throw new Error("写操作需要前端确认后才能执行");
  }

  const projects = await getConfiguredProjects();
  const project = projects.find((item) => item.id === config.projectId);
  if (!project) {
    throw new Error(`Unknown project: ${config.projectId}`);
  }

  const activeExecutionId = store.activeByProject.get(project.id);
  if (activeExecutionId) {
    const active = store.executions.get(activeExecutionId);
    if (active && (active.status === "pending" || active.status === "running")) {
      throw new Error(`Project ${project.id} already has a running execution: ${activeExecutionId}`);
    }
    store.activeByProject.delete(project.id);
  }

  const executionId = randomUUID();
  const record: AgentExecutionRecord = {
    executionId,
    projectId: project.id,
    projectPath: project.path,
    commandId: resolved.definition.id,
    command: `gsd-tools ${resolved.args.join(" ")}`,
    args: resolved.args,
    status: "pending",
    pid: null,
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    exitCode: null,
    child: null,
    startedAtMs: null,
    timeout: null,
    stdout: "",
    stderr: "",
    logs: [],
    listeners: new Set(),
  };

  store.executions.set(executionId, record);
  store.activeByProject.set(project.id, executionId);
  emitStatus(record, "pending");
  addLog(record, "system", `准备执行 ${record.command}`, "system");
  if (config.triggeredBy) {
    addLog(record, "system", `触发来源: ${config.triggeredBy}`, "system");
  }

  startChildProcess(record, config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  return toSnapshot(record);
}

export function stopExecution(executionId: string): AgentExecutionSnapshot | null {
  const record = store.executions.get(executionId);
  if (!record) return null;

  if (record.status !== "pending" && record.status !== "running") {
    return toSnapshot(record);
  }

  addLog(record, "warn", "收到停止请求，正在终止子进程", "system");
  record.status = "stopped";
  if (record.child && !record.child.killed) {
    record.child.kill("SIGTERM");
    setTimeout(() => {
      if (record.child && !record.child.killed) {
        record.child.kill("SIGKILL");
      }
    }, 5000);
  } else {
    finishExecution(record, "stopped", null);
  }

  emitStatus(record, "stopped");
  return toSnapshot(record);
}

export function getExecutionStatus(executionId: string): AgentExecutionSnapshot | null {
  const record = store.executions.get(executionId);
  return record ? toSnapshot(record) : null;
}

export function onLog(executionId: string, callback: (event: AgentExecutionEvent) => void): (() => void) | null {
  const record = store.executions.get(executionId);
  if (!record) return null;

  record.listeners.add(callback);
  return () => {
    record.listeners.delete(callback);
  };
}

function startChildProcess(record: AgentExecutionRecord, timeoutMs: number) {
  const startMs = Date.now();
  record.startedAtMs = startMs;
  record.startedAt = new Date(startMs).toISOString();

  const child = spawn("node", [CLI_PATH, ...record.args], {
    cwd: record.projectPath,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  record.child = child;
  record.pid = child.pid ?? null;
  emitStatus(record, "running");
  addLog(record, "system", `进程已启动${record.pid ? ` (pid ${record.pid})` : ""}`, "system");

  record.timeout = setTimeout(() => {
    if (record.status !== "running") return;
    addLog(record, "error", `执行超过 ${Math.round(timeoutMs / 1000)} 秒，已自动终止`, "system");
    record.status = "failed";
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
    }, 5000);
  }, timeoutMs);

  child.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    record.stdout += text;
    for (const line of splitLogLines(text)) {
      addLog(record, "info", line, "stdout");
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    record.stderr += text;
    for (const line of splitLogLines(text)) {
      addLog(record, "error", line, "stderr");
    }
  });

  child.on("error", (error) => {
    record.error = error.message;
    addLog(record, "error", error.message, "system");
    emit(record, { type: "error", executionId: record.executionId, message: error.message, timestamp: Date.now() });
    finishExecution(record, "failed", null);
  });

  child.on("close", (code) => {
    if (record.status === "stopped") {
      finishExecution(record, "stopped", code);
    } else if (record.status === "failed") {
      finishExecution(record, "failed", code);
    } else {
      finishExecution(record, code === 0 ? "completed" : "failed", code);
    }
  });
}

function finishExecution(record: AgentExecutionRecord, status: "completed" | "failed" | "stopped", exitCode: number | null) {
  if (record.timeout) {
    clearTimeout(record.timeout);
    record.timeout = null;
  }

  if (record.endedAt) return;

  const endedAtMs = Date.now();
  record.status = status;
  record.exitCode = exitCode;
  record.endedAt = new Date(endedAtMs).toISOString();
  record.durationMs = record.startedAtMs ? endedAtMs - record.startedAtMs : 0;
  store.activeByProject.delete(record.projectId);

  if (status === "completed") {
    addLog(record, "success", `执行完成，耗时 ${record.durationMs}ms`, "system");
  } else if (status === "stopped") {
    addLog(record, "warn", `执行已停止，耗时 ${record.durationMs}ms`, "system");
  } else {
    addLog(record, "error", `执行失败，退出码 ${exitCode ?? "unknown"}`, "system");
  }

  emitStatus(record, status);
  emit(record, {
    type: "completed",
    executionId: record.executionId,
    status,
    exitCode,
    durationMs: record.durationMs,
    timestamp: endedAtMs,
  });

  void appendAuditLog({
    command: record.commandId,
    args: record.args,
    projectId: record.projectId,
    result: status === "completed" ? "success" : status === "stopped" ? "cancelled" : "failure",
    durationMs: record.durationMs,
    stdout: record.stdout ? record.stdout.slice(0, 2000) : undefined,
    stderr: record.stderr || record.error ? (record.stderr || record.error || "").slice(0, 2000) : undefined,
  });
}

function resolveCommand(command: string, extraArgs: string[]) {
  const definition = GSD_COMMANDS.find((item) => item.id === command);
  if (!definition) {
    throw new Error(`Unknown command: ${command}`);
  }

  return {
    definition,
    args: [...definition.args, ...extraArgs],
  };
}

function emitStatus(record: AgentExecutionRecord, status: AgentExecutionStatus) {
  record.status = status;
  emit(record, { type: "status_change", executionId: record.executionId, status, timestamp: Date.now() });
}

function addLog(record: AgentExecutionRecord, level: AgentLogLevel, message: string, source: AgentExecutionLog["source"]) {
  const trimmed = message.trim();
  if (!trimmed) return;

  const log: AgentExecutionLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    message: trimmed,
    source,
  };

  record.logs.push(log);
  if (record.logs.length > MAX_LOGS_PER_EXECUTION) {
    record.logs.splice(0, record.logs.length - MAX_LOGS_PER_EXECUTION);
  }
  emit(record, { type: "log", executionId: record.executionId, log });
}

function emit(record: AgentExecutionRecord, event: AgentExecutionEvent) {
  for (const listener of record.listeners) {
    listener(event);
  }
}

function splitLogLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function toSnapshot(record: AgentExecutionRecord): AgentExecutionSnapshot {
  return {
    executionId: record.executionId,
    projectId: record.projectId,
    projectPath: record.projectPath,
    commandId: record.commandId,
    command: record.command,
    args: record.args,
    status: record.status,
    pid: record.pid,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    durationMs: record.status === "running" && record.startedAtMs ? Date.now() - record.startedAtMs : record.durationMs,
    exitCode: record.exitCode,
    logs: [...record.logs],
    error: record.error,
  };
}
