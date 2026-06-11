// ── GSD Command Types & Registry (shared between client and server) ──

export type GsdCommandId =
  | "state"
  | "roadmap-analyze"
  | "progress"
  | "health"
  | "validate"
  | "list-todos"
  | "commit"
  | "find-phase"
  | "init"
  | "verify-summary"
  | "generate-slug";

export interface GsdCommand {
  id: GsdCommandId;
  label: string;
  description: string;
  args: string[];
  /** Whether this command modifies project state */
  isWrite: boolean;
  /** Category for grouping in command palette */
  category: "read" | "write" | "admin";
}

export const GSD_COMMANDS: GsdCommand[] = [
  { id: "state", label: "查看项目状态", description: "gsd-tools state json — 获取当前项目状态", args: ["state", "json"], isWrite: false, category: "read" },
  { id: "roadmap-analyze", label: "分析路线图", description: "gsd-tools roadmap analyze — 获取路线图分析", args: ["roadmap", "analyze"], isWrite: false, category: "read" },
  { id: "progress", label: "查看进度", description: "gsd-tools progress json — 获取进度数据", args: ["progress", "json"], isWrite: false, category: "read" },
  { id: "health", label: "健康检查", description: "gsd-tools validate health — 检查项目健康状态", args: ["validate", "health"], isWrite: false, category: "read" },
  { id: "validate", label: "一致性验证", description: "gsd-tools validate consistency — 验证数据一致性", args: ["validate", "consistency"], isWrite: false, category: "read" },
  { id: "list-todos", label: "查看待办", description: "gsd-tools list-todos — 列出所有待办项", args: ["list-todos"], isWrite: false, category: "read" },
  { id: "commit", label: "提交变更", description: "gsd-tools commit — 生成规范的 commit", args: ["commit"], isWrite: true, category: "write" },
  { id: "find-phase", label: "查找阶段", description: "gsd-tools find-phase — 定位当前阶段", args: ["find-phase"], isWrite: false, category: "read" },
  { id: "init", label: "初始化项目", description: "gsd-tools init — 初始化 GSD 项目配置", args: ["init"], isWrite: true, category: "admin" },
  { id: "verify-summary", label: "验证摘要", description: "gsd-tools verify-summary — 验证 SUMMARY.md 质量", args: ["verify-summary"], isWrite: false, category: "read" },
  { id: "generate-slug", label: "生成 Slug", description: "gsd-tools generate-slug — 生成 URL 友好的 slug", args: ["generate-slug"], isWrite: false, category: "read" },
];
