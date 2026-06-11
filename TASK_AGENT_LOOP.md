# Agent 执行闭环开发任务

## 项目路径
`/Users/zouxunni/Documents/work/gsd-dashboard`

## 项目概况
GSD Dashboard 是基于 Next.js 16.2.9 + React 19.2.4 + shadcn/ui 的 Web 管理界面，解析 `.planning/` 目录下的 markdown 文件展示 GSD 工作流进度。已完成 Phase 1-4（只读仪表盘、命令触发、实时监控、高级功能）。

## 目标
实现 **Agent 执行闭环**：让 Dashboard 能真正驱动 GSD 工作流执行，而不只是查看状态和调用 CLI 读命令。

## 核心需求

### 1. Agent Executor（API 层）
新建 `src/app/api/execute/route.ts`，实现长时间运行的命令执行：
- POST: 接受 `{ action: "start" | "stop" | "status", command: string, projectId: string, args: string[] }` 
- 使用 Node.js `spawn` 替代 `execFile`，支持长时间运行的子进程
- 维护执行状态（内存 Map），支持 SSE 推送日志
- 每个执行分配唯一 `executionId`

### 2. Agent Process Manager（核心模块）
新建 `src/lib/agent-executor.ts`：
- `startExecution(config)` → 启动 GSD 命令作为子进程
- `stopExecution(executionId)` → 终止子进程
- `getExecutionStatus(executionId)` → 获取状态
- `onLog(executionId, callback)` → 日志回调
- 执行状态：`pending → running → completed | failed | stopped`
- 子进程超时保护（默认 10 分钟）
- 执行队列：同一项目同一时间只允许一个执行

### 3. 执行日志流式推送
新建 `src/app/api/execute/[id]/stream/route.ts`：
- SSE endpoint，推送执行日志
- 事件类型：`log`、`status_change`、`completed`、`error`
- 连接断开时保持执行（不杀进程），重连可恢复日志

### 4. Execute Page 增强
修改 `src/app/execute/page.tsx`：
- 连接真实执行 API（替换当前模拟的 fetch /api/command）
- 显示执行状态：pending → running → completed/failed
- SSE 日志流实时更新 LiveLog 组件
- 支持停止执行
- 执行完成后自动刷新项目状态

### 5. Wave 自动推进
修改 `src/lib/blocker-detector.ts` 中已有的 `detectWaveCompletion`：
- 新增 `POST /api/wave-advance` 端点
- 当检测到当前 Wave 全部完成时，自动触发下一 Wave 的第一个 Plan
- 推送通知给前端（SSE）

### 6. 命令扩展
修改 `src/lib/command-types.ts`，新增写操作命令：
```typescript
{ id: "execute-phase", label: "执行 Phase", description: "开始执行指定 Phase", args: ["execute", "phase"], isWrite: true, category: "write" }
{ id: "execute-plan", label: "执行 Plan", description: "开始执行指定 Plan", args: ["execute", "plan"], isWrite: true, category: "write" }
{ id: "advance-wave", label: "推进 Wave", description: "推进到下一个 Wave", args: ["wave", "advance"], isWrite: true, category: "write" }
{ id: "verify-work", label: "验证工作", description: "验证当前工作完成情况", args: ["verify"], isWrite: true, category: "write" }
```

### 7. Phase 详情页操作按钮增强
修改 `src/components/gsd/PhaseDetailView.tsx`：
- 添加"执行 Phase"按钮（调用 execute-phase 命令）
- 添加"验证工作"按钮（调用 verify-work 命令）
- 按钮状态根据 Phase 状态动态变化（not_started → 显示"开始执行"，in_progress → 显示"继续执行"）

## 设计约束
- **不要安装新依赖**，只用现有的
- **暗色主题**：bg-slate-900/60 卡片, border-white/10, text-white/slate-*
- **所有交互组件使用 `"use client"`**
- **Node.js 模块不可出现在客户端 bundle** — agent-executor.ts 只在 API 路由中导入
- **写操作必须经过确认** — 前端弹窗确认后再调用 API
- **审计日志**：所有写操作记录到审计日志
- 子进程工作目录为项目路径（从 GSD_PROJECTS 获取）
- CLI 路径：`~/.cursor/get-shit-done/bin/gsd-tools.cjs`
- 不修改 `.planning/` 文件，所有写操作通过 CLI

## 文件结构
```
src/
├── app/
│   ├── api/
│   │   ├── execute/
│   │   │   ├── route.ts          # POST: start/stop/status
│   │   │   └── [id]/
│   │   │       └── stream/route.ts  # SSE 日志流
│   │   └── wave-advance/
│   │       └── route.ts          # POST: Wave 自动推进
│   └── execute/
│       └── page.tsx              # 修改：连接真实 API
├── lib/
│   ├── agent-executor.ts         # 新建：进程管理器
│   ├── command-types.ts          # 修改：新增命令
│   └── blocker-detector.ts       # 修改：Wave 推进逻辑
└── components/
    └── gsd/
        └── PhaseDetailView.tsx   # 修改：操作按钮
```

## 验证
完成后运行 `npx next build` 确保构建通过。

## 不要做
- 不要 git commit
- 不要安装新依赖
- 不要修改 gsd-bridge.ts 或 parser/ 下的文件
- 不要修改 layout.tsx
