import { NextResponse } from "next/server";
import { getConfiguredProjects } from "@/lib/gsd-bridge";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project");

  const projects = await getConfiguredProjects();
  const activeProject = projects.find((p) => p.id === projectId) || projects[0];
  if (!activeProject) {
    return NextResponse.json({ error: "No project configured" }, { status: 404 });
  }

  const planningRoot = path.join(activeProject.path, ".planning");

  async function walk(dir: string, prefix: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        files.push(rel + "/");
        files.push(...await walk(path.join(dir, entry.name), rel));
      } else {
        files.push(rel);
      }
    }
    return files;
  }

  try {
    const allFiles = await walk(planningRoot, "");
    // Filter out hidden files and limit depth for readability
    const files = allFiles.filter(
      (f) => !f.split("/").some((p) => p.startsWith("."))
    );
    return NextResponse.json({ files, root: planningRoot });
  } catch (err) {
    return NextResponse.json({ error: String(err), files: [] }, { status: 500 });
  }
}
