# GSD Dashboard P0 + P1 改进任务规划

## 概述

将 GSD Dashboard 从「展示型仪表盘」升级为「操作型工作台」。  
核心目标：**打开 Dashboard → 看到状态 → 点「下一步」→ 自动执行 → 看到结果 → 循环**

---

## Phase 1: P0 基础设施（骨架）

> 目标：补全产品必备的基础能力

### Task 1.1: 全局 Toast 通知组件
- **文件**: `src/components/ui/toast.tsx`（新建）
- **内容**:
  - 创建 `ToastProvider` + `useToast` hook
  - 支持 success / error / warning / info 四种类型
  - 自动消失（默认 4s）+ 手动关闭
  - 位于页面右上角，堆叠显示
- **集成点**: `layout.tsx` 包裹 `<ToastProvider>`
- **依赖**: 无

### Task 1.2: 统一 API 错误处理 + 加载状态骨架屏
- **文件**: `src/components/ui/skeleton.tsx`（新建）, `src/components/ui/error-boundary.tsx`（新建）, `src/lib/hooks/use-api.ts`（新建）
- **内容**:
  - Skeleton 骨架屏组件（卡片、列表、文本行三种形态）
  - ErrorBoundary 组件（捕获渲染错误，展示友好提示 + 重试按钮）
  - `useApi<T>(url)` hook：统一封装 fetch + loading / error / data 状态
- **集成点**: DashboardOverview、PhaseDetailView、SettingsPage 均接入
- **依赖**: Task 1.1（错误提示用 Toast）

### Task 1.3: 项目配置热更新（Settings 页面改造）
- **文件**: `src/app/settings/page.tsx`（改造）, `src/app/api/settings/route.ts`（新建）
- **内容**:
  - 新建 API: `POST /api/settings` — 将项目配置写回 `.env.local`
  - 新建 API: `GET /api/settings` — 读取当前配置
  - Settings 页面：添加项目 → 验证路径是否存在 `.planning/` → 保存 → 不用重启即可生效
  - 支持选择本地目录（文件浏览器弹窗或手动输入路径后验证）
- **当前问题**: Settings 页面的「保存」按钮只是 `setSaved(true)` 假保存
- **依赖**: Task 1.1（保存成功/失败提示）

### Task 1.4: 首次使用引导（Onboarding）
- **文件**: `src/components/gsd/OnboardingWizard.tsx`（新建）, `src/app/page.tsx`（改造）
- **内容**:
  - 检测：如果 `GSD_PROJECTS` 为空或未配置 → 显示引导
  - Step 1: 欢迎页 — 简述 Dashboard 功能
  - Step 2: 选择项目目录 — 输入路径 → 自动扫描 `.planning/` → 预览项目信息
  - Step 3: 确认配置 → 调用 `/api/settings` 保存
  - Step 4: 完成 → 跳转到 Dashboard
- **依赖**: Task 1.3

---

## Phase 2: P0 核心交互（一键工作流）

> 目标：从「看状态」到「点一下就执行下一步」

### Task 2.1: 智能下一步建议引擎
- **文件**: `src/lib/next-step-engine.ts`（新建）, `src/app/api/next-step/route.ts`（新建）
- **内容**:
  - 根据 STATE.md 状态自动推荐下一步：
    - `ready_to_plan` → "生成当前 Phase 的 Plan"
    - `planning` → "审查并确认 Plan"
    - `ready_to_execute` / `in_progress` + Wave 完成 → "推进到下一 Wave"
    - `in_progress` + 有未完成 Plan → "执行下一个 Plan"
    - `phase_complete` → "进入下一 Phase"
    - `completed` → "项目已完成 🎉"
    - 有 blocker → "解决阻塞项"
  - 返回结构：`{ suggestedAction, commandId, description, args, priority }`
- **依赖**: 无

### Task 2.2: 「下一步」操作卡片组件
- **文件**: `src/components/gsd/NextStepCard.tsx`（新建）
- **内容**:
  - 在 Dashboard 总览页顶部显著位置展示
  - 显示建议的操作名称、说明、影响范围
  - 一个大的「执行」按钮 + 「跳过」按钮
  - 点击执行 → 自动调用对应 command → 实时显示进度
  - 执行完成后自动刷新状态 → 推荐新的下一步
- **集成点**: `DashboardOverview.tsx` 顶部
- **依赖**: Task 2.1, Task 1.1（执行结果 Toast）

### Task 2.3: 简化执行页面（一键模式）
- **文件**: `src/app/execute/page.tsx`（改造）
- **内容**:
  - 当前问题：用户需要理解「队列」概念，逐个添加命令
  - 改造：
    - 顶部新增「快速执行」区域：显示当前推荐的下一步 + 一键执行
    - 保留队列模式作为「高级模式」
    - 执行完成后自动检查并推荐下一个动作
    - 连续执行时显示进度条（1/3 → 2/3 → 3/3）
- **依赖**: Task 2.1, Task 2.2

---

## Phase 3: P1 体验提升

> 目标：减少摩擦，自动化常见操作

### Task 3.1: 自定义确认弹窗（替换 window.confirm）
- **文件**: `src/components/ui/confirm-dialog.tsx`（新建）
- **内容**:
  - 替换所有 `window.confirm` 调用
  - 显示：操作名称 + 影响描述 + 将修改的文件列表（如果有）
  - 按钮：「确认执行」「取消」
  - 支持危险操作二次确认（输入确认文字）
- **集成点**: PhaseDetailView 的 PhaseActionButton、ExecutePage 的写操作确认
- **依赖**: 无

### Task 3.2: Wave 完成自动提示 + 推进
- **文件**: `src/components/gsd/WaveAdvancePrompt.tsx`（新建）, `src/components/gsd/DashboardOverview.tsx`（改造）
- **内容**:
  - 利用已有的 `detectWaveCompletion` 检测
  - SSE 推送或轮询检测到 Wave 完成时：
    - 页面顶部弹出提示：「Wave 1 已完成 ✅ 是否推进到 Wave 2？」
    - 按钮：「推进」→ 调用 `/api/wave-advance` → 刷新
    - 按钮：「稍后」→ 关闭提示
  - 如果当前处于 Phase 详情页，也在该页显示
- **依赖**: Task 1.1（推送通知）

### Task 3.3: 浏览器通知
- **文件**: `src/lib/hooks/use-notifications.ts`（新建）, `src/components/gsd/NotificationPermission.tsx`（新建）
- **内容**:
  - 请求浏览器 Notification 权限（首次时引导）
  - 事件触发点：
    - 执行完成（成功/失败）
    - 新的阻塞项出现
    - Phase 完成
    - Wave 可推进
  - 页面不可见时才触发浏览器通知，页面可见时用 Toast
- **依赖**: Task 1.1

### Task 3.4: Phase 详情页 Tab 分区
- **文件**: `src/components/gsd/PhaseDetailView.tsx`（改造）
- **内容**:
  - 当前：Plan 列表、文档、Wave 图全部堆在一个长页面
  - 改为 Tab 布局：
    - **概览** Tab: 进度条 + Wave 图 + 操作按钮
    - **Plans** Tab: Wave 分组的 Plan 列表（当前默认视图）
    - **文档** Tab: CONTEXT / RESEARCH / UAT 切换查看
    - **活动** Tab: 时间线
  - Tab 切换用 URL query 参数持久化（`?tab=plans`）
- **依赖**: 无

### Task 3.5: 加载状态完善
- **文件**: 所有页面组件
- **内容**:
  - DashboardOverview: 首次加载 → Skeleton 卡片网格
  - PhaseDetailView: 首次加载 → Skeleton 详情
  - ExecutePage: 已有 loading 态
  - SettingsPage: 已有即时渲染
  - 统一使用 Task 1.2 的 Skeleton 组件
- **依赖**: Task 1.2

---

## 执行顺序与依赖关系

```
Phase 1（基础设施）:
  1.1 Toast ──┐
  1.2 Skeleton/ErrorBoundary/useApi ──┤── 依赖 1.1
  1.3 Settings 热更新 ────────────────┤── 依赖 1.1
  1.4 Onboarding ─────────────────────┘── 依赖 1.3

Phase 2（核心交互）:
  2.1 下一步建议引擎 ──────── 无依赖，可先做
  2.2 NextStepCard ─────────── 依赖 2.1 + 1.1
  2.3 执行页面简化 ─────────── 依赖 2.1 + 2.2

Phase 3（体验提升）:
  3.1 确认弹窗 ────────────── 无依赖，可先做
  3.2 Wave 自动提示 ────────── 依赖 1.1
  3.3 浏览器通知 ───────────── 依赖 1.1
  3.4 Phase Tab 分区 ───────── 无依赖，可先做
  3.5 加载状态完善 ─────────── 依赖 1.2
```

## 预估工作量

| Phase | Tasks | 预估 |
|-------|-------|------|
| Phase 1 | 4 个 | ~60% |
| Phase 2 | 3 个 | ~25% |
| Phase 3 | 5 个 | ~15% |

## 验收标准

- [ ] 首次打开有引导流程
- [ ] API 错误有 Toast 提示，不静默失败
- [ ] Settings 页面保存后配置真正生效
- [ ] Dashboard 顶部有「下一步」建议卡片
- [ ] 一键执行 → 自动刷新 → 推荐新下一步
- [ ] 写操作用自定义弹窗确认，不用 window.confirm
- [ ] Wave 完成有自动提示
- [ ] Phase 详情页用 Tab 分区
