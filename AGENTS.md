# GSD Dashboard — MVP 开发指令

## 项目概述

为 GSD (Get Shit Done) 工作流系统开发一个 Web 可视化仪表盘。GSD 是一个 AI 编码工作流框架，使用 `.planning/` 目录下的 Markdown 文件管理项目状态。

## 技术栈

- **框架**: Next.js 15 (App Router) + TypeScript
- **样式**: TailwindCSS + shadcn/ui
- **文件监听**: chokidar
- **Markdown 解析**: gray-matter (YAML frontmatter)
- **包管理器**: npm

## MVP 功能需求

### 1. 项目状态 API（GET /api/status）

读取项目的 `.planning/` 目录，调用 `gsd-tools.cjs` 获取结构化数据：

```bash
# 获取状态 JSON
node ~/.cursor/get-shit-done/bin/gsd-tools.cjs state json --project-root <project-path>

# 获取路线图分析
node ~/.cursor/get-shit-done/bin/gsd-tools.cjs roadmap analyze --project-root <project-path>

# 获取进度
node ~/.cursor/get-shit-done/bin/gsd-tools.cjs progress json --project-root <project-path>

# 获取健康状态
node ~/.cursor/get-shit-done/bin/gsd-tools.cjs validate health --project-root <project-path>
```

如果 `--project-root` 参数不支持，则 `cd <project-path> && node ~/.cursor/get-shit-done/bin/gsd-tools.cjs <command>`。

如果 gsd-tools.cjs 执行失败，需要降级为直接解析 Markdown 文件：
- `STATE.md` — YAML frontmatter 解析
- `ROADMAP.md` — Markdown 标题 + 列表解析
- `config.json` — JSON 直接解析
- `phases/*/` — 目录扫描，读取每个 PLAN.md 和 SUMMARY.md 的 frontmatter

### 2. Dashboard 总览页（/）

展示内容：
- **项目名称和描述** — 从 PROJECT.md 解析
- **进度条** — 总体完成百分比（从 progress json 获取）
- **Phase 卡片网格** — 每个 Phase 显示：编号、名称、状态、完成计划数/总计划数
- **阻塞项列表** — 从 STATE.md 的 blockers 部分解析
- **最近活动** — 从各个 SUMMARY.md 的时间戳聚合

### 3. Phase 详情页（/phases/[number]）

展示内容：
- **Phase 目标和状态**
- **Plan 列表** — 按 Wave 分组，每个 Plan 显示：编号、状态、文件列表
- **Wave 依赖图** — 简单的可视化（哪些 Plan 在哪个 Wave）
- **文档查看** — CONTEXT.md / RESEARCH.md / UAT.md 的 Markdown 渲染

### 4. 文件监听

使用 chokidar 监听 `.planning/` 目录变更，自动刷新页面数据。

### 5. 项目切换

支持配置多个 GSD 项目路径，可在 Dashboard 顶部切换。

## .planning/ 目录结构参考

```
.planning/
├── PROJECT.md          # 项目定义（core_value, constraints, tech_stack）
├── STATE.md            # 活状态（YAML frontmatter + Markdown body）
├── ROADMAP.md          # 路线图（Phase 列表 + 进度表格）
├── REQUIREMENTS.md     # 需求追踪（REQ-01, REQ-02...）
├── config.json         # 项目配置
├── MILESTONES.md       # 里程碑归档
├── phases/
│   ├── 01-auth/
│   │   ├── 01-CONTEXT.md      # Phase 上下文决策
│   │   ├── 01-RESEARCH.md     # 技术研究
│   │   ├── 01-01-PLAN.md      # Plan 1（frontmatter: wave, depends_on, files_modified）
│   │   ├── 01-01-SUMMARY.md   # Plan 1 执行结果
│   │   ├── 01-02-PLAN.md      # Plan 2
│   │   ├── 01-02-SUMMARY.md   # Plan 2 执行结果
│   │   └── 01-UAT.md          # UAT 检查清单
│   └── 02-dashboard/
│       └── ...
└── codebase/           # 代码库分析（可选）
```

## STATE.md frontmatter 格式

```yaml
---
project: "项目名"
current_phase: 2
current_plan: 3
status: "in_progress"  # ready_to_plan | planning | ready_to_execute | in_progress | phase_complete
progress: 65
completed_plans: 13
total_plans: 20
---
```

## PLAN.md frontmatter 格式

```yaml
---
phase: "02-dashboard"
plan: 1
type: "execute"
wave: 1
depends_on: []
files_modified:
  - "src/components/Dashboard.tsx"
  - "src/hooks/useData.ts"
autonomous: true
must_haves:
  truths: []
  artifacts: []
---
```

## SUMMARY.md frontmatter 格式

```yaml
---
phase: "02-dashboard"
plan: 1
status: "complete"
goal: "实现基础布局"
files_modified: [...]
deviations: []
---

## Key Results
- 结果1
- 结果2
```

## UI 设计要求

- **配色**: 深色主题（#0f172a 背景，白色文字）
- **状态颜色**: ✅ 完成=绿色 / 🔄 进行中=蓝色 / ⏳ 等待=灰色 / ❌ 阻塞=红色
- **布局**: 左侧导航栏（项目列表）+ 右侧主内容区
- **响应式**: 优先桌面端，移动端可访问即可
- **字体**: 系统默认字体栈

## 项目初始化

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx shadcn@latest init
```

## 关键文件

- GSD 工具 CLI: `~/.cursor/get-shit-done/bin/gsd-tools.cjs`
- 技术方案详细文档: `~/.openclaw/workspace/GSD_Visual_Dashboard_TechSpec.md`

## 注意事项

1. gsd-tools.cjs 的某些命令可能需要 --project-root 参数，如果不支持就用 cd + 执行的方式
2. gsd-tools.cjs 的输出格式是 JSON，直接 JSON.parse 即可
3. 如果 gsd-tools.cjs 失败，降级为直接解析 Markdown 文件
4. 页面要支持实时刷新（WebSocket 或 SSE），MVP 阶段可以先用轮询（5秒间隔）
5. 不要使用 shadcn/ui 的付费组件
6. 代码要有中文注释
7. npm scripts 要包含 dev / build / start
