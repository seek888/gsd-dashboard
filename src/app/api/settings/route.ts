import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// ── Settings API ──────────────────────────────────────────────

interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  description?: string;
}

const ENV_FILE = path.join(process.cwd(), ".env.local");

function parseEnvProjects(envContent: string): ProjectConfig[] {
  const match = envContent.match(/GSD_PROJECTS=(.+)/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

function buildEnvContent(existingContent: string, projects: ProjectConfig[]): string {
  const lines = existingContent.split("\n");
  const filtered = lines.filter((line) => !line.startsWith("GSD_PROJECTS="));
  // 追加新的 GSD_PROJECTS 行
  filtered.push(`GSD_PROJECTS=${JSON.stringify(projects)}`);
  return filtered.join("\n");
}

// GET: 读取当前配置
export async function GET() {
  try {
    let envContent = "";
    try {
      envContent = await fs.readFile(ENV_FILE, "utf8");
    } catch {
      // 文件不存在
    }

    const projects = parseEnvProjects(envContent);

    return NextResponse.json({
      projects,
      envFileExists: true,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: 保存配置
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      projects: ProjectConfig[];
    };

    if (!Array.isArray(body.projects)) {
      return NextResponse.json({ error: "projects 必须是数组" }, { status: 400 });
    }

    // 验证每个项目路径
    for (const project of body.projects) {
      if (!project.id || !project.name || !project.path) {
        return NextResponse.json(
          { error: `项目 "${project.name || project.id}" 缺少必要字段 (id, name, path)` },
          { status: 400 },
        );
      }

      // 检查路径是否存在
      try {
        const stat = await fs.stat(project.path);
        if (!stat.isDirectory()) {
          return NextResponse.json(
            { error: `路径 "${project.path}" 不是目录` },
            { status: 400 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: `路径 "${project.path}" 不存在` },
          { status: 400 },
        );
      }
    }

    // 读取现有 .env.local
    let envContent = "";
    try {
      envContent = await fs.readFile(ENV_FILE, "utf8");
    } catch {
      // 文件不存在，创建新文件
    }

    // 更新内容
    const newContent = buildEnvContent(envContent, body.projects);
    await fs.writeFile(ENV_FILE, newContent, "utf8");

    // 更新 process.env（让当前进程生效）
    process.env.GSD_PROJECTS = JSON.stringify(body.projects);

    return NextResponse.json({
      success: true,
      projects: body.projects,
      message: "配置已保存",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── 验证路径 ──────────────────────────────────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { path: string };
    if (!body.path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const resolvedPath = path.resolve(body.path);

    // 检查目录是否存在
    try {
      const stat = await fs.stat(resolvedPath);
      if (!stat.isDirectory()) {
        return NextResponse.json({ valid: false, reason: "不是目录" });
      }
    } catch {
      return NextResponse.json({ valid: false, reason: "路径不存在" });
    }

    // 检查是否有 .planning 目录
    const planningPath = path.join(resolvedPath, ".planning");
    let hasPlanning = false;
    const planningInfo: Record<string, unknown> = {};
    try {
      const planningStat = await fs.stat(planningPath);
      hasPlanning = planningStat.isDirectory();

      if (hasPlanning) {
        // 尝试读取项目信息
        try {
          const stateContent = await fs.readFile(path.join(planningPath, "STATE.md"), "utf8");
          planningInfo.hasState = true;
          // 简单提取项目名
          const nameMatch = stateContent.match(/project:\s*["']?([^"'\n]+)/);
          if (nameMatch) planningInfo.projectName = nameMatch[1];
        } catch { /* no STATE.md */ }

        try {
          const entries = await fs.readdir(planningPath);
          planningInfo.files = entries.filter((e) => !e.startsWith("."));
          planningInfo.phasesDir = entries.includes("phases");
        } catch { /* ignore */ }
      }
    } catch { /* no .planning */ }

    return NextResponse.json({
      valid: true,
      path: resolvedPath,
      hasPlanning,
      planningInfo,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
