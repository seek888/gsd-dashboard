import { NextResponse } from "next/server";
import { getConfiguredProjects } from "@/lib/gsd-bridge";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project");
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Security: prevent path traversal
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const projects = await getConfiguredProjects();
  const activeProject = projects.find((p) => p.id === projectId) || projects[0];
  if (!activeProject) {
    return NextResponse.json({ error: "No project configured" }, { status: 404 });
  }

  const fullPath = path.join(activeProject.path, ".planning", filePath);

  try {
    const content = await fs.readFile(fullPath, "utf8");
    const ext = path.extname(filePath).toLowerCase();
    return NextResponse.json({
      content,
      path: filePath,
      ext,
      size: content.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 });
  }
}
