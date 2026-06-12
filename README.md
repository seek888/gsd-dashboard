# GSD Dashboard

GSD (Get Shit Done) 工作流系统的 Web 可视化仪表盘。实时展示项目状态、Phase 进度、阻塞项和计划执行情况。

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript
- **样式**: TailwindCSS 4 + shadcn/ui
- **文件监听**: chokidar
- **Markdown 解析**: gray-matter
- **包管理器**: npm

## 环境要求

- Node.js >= 18
- npm >= 8

## 配置

复制环境变量模板并修改：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，配置要监控的 GSD 项目：

```env
# 单项目
GSD_PROJECTS=[{"id":"my-project","name":"My Project","path":"/path/to/project"}]

# 多项目
GSD_PROJECTS=[{"id":"proj-a","name":"Project A","path":"/path/to/a"},{"id":"proj-b","name":"Project B","path":"/path/to/b"}]
```

> 如果未配置 `GSD_PROJECTS`，Dashboard 会尝试读取当前工作目录下的 `.planning/` 目录。

## 运行方式

### 开发模式（DEV）

热更新、实时编译，适合本地开发调试：

```bash
npm install
npm run dev
```

启动后访问 [http://localhost:3000](http://localhost:3000)。

### 生产构建 & 运行（Production）

先构建优化产物，再用 Node.js 启动生产服务器：

```bash
# 安装依赖（仅首次或依赖变更时）
npm install

# 构建生产产物
npm run build

# 启动生产服务器
npm start
```

启动后访问 [http://localhost:3000](http://localhost:3000)。

**生产模式 vs 开发模式的区别：**

| | 开发模式 (`npm run dev`) | 生产模式 (`npm run build` + `npm start`) |
|---|---|---|
| 热更新 | ✅ 文件修改自动刷新 | ❌ 需重新 build |
| 性能 | 较慢（实时编译） | ✅ 预编译优化，响应更快 |
| 错误提示 | 详细堆栈 | 精简提示 |
| 适用场景 | 本地开发调试 | 部署到服务器 / 日常使用 |

### 指定端口

默认端口 `3000`，可以通过环境变量修改：

```bash
# 开发模式
PORT=4000 npm run dev

# 生产模式
PORT=4000 npm start
```

### 后台运行（Linux/macOS）

使用 `nohup` 让进程在终端关闭后继续运行：

```bash
# 构建
npm run build

# 后台启动
nohup npm start > gsd-dashboard.log 2>&1 &

# 查看日志
tail -f gsd-dashboard.log

# 停止
kill $(lsof -t -i:3000)
```

或者使用 **pm2**（推荐，支持自动重启）：

```bash
# 安装 pm2
npm install -g pm2

# 构建并启动
npm run build
pm2 start npm --name "gsd-dashboard" -- start

# 常用命令
pm2 status                    # 查看状态
pm2 logs gsd-dashboard        # 查看日志
pm2 restart gsd-dashboard     # 重启
pm2 stop gsd-dashboard        # 停止
pm2 delete gsd-dashboard      # 删除进程
```

### 使用 systemd（Linux 服务器）

创建服务文件 `/etc/systemd/system/gsd-dashboard.service`：

```ini
[Unit]
Description=GSD Dashboard
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/gsd-dashboard
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

启动并设置开机自启：

```bash
sudo systemctl daemon-reload
sudo systemctl start gsd-dashboard
sudo systemctl enable gsd-dashboard

# 查看状态
sudo systemctl status gsd-dashboard

# 查看日志
journalctl -u gsd-dashboard -f
```

### Docker 部署

如果需要容器化部署，可创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> 注意：使用 standalone 输出模式需在 `next.config.ts` 中添加 `output: "standalone"`。

## 其他命令

```bash
# 代码检查
npm run lint
```

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 总览页
│   ├── layout.tsx            # 根布局
│   ├── globals.css           # 全局样式
│   ├── api/                  # API 路由
│   │   ├── status/           # 项目状态
│   │   ├── phases/           # Phase 数据
│   │   ├── blockers/         # 阻塞项
│   │   ├── execute/          # 计划执行
│   │   ├── stream/           # SSE 实时推送
│   │   └── ...               # 其他 API
│   ├── phases/[number]/      # Phase 详情页
│   └── settings/             # 设置页
└── ...
```
