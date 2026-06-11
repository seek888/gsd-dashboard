import { watch } from "chokidar";
import { NextRequest } from "next/server";

// ── File Watcher (singleton per project) ──────────────────────

const watchers = new Map<string, ReturnType<typeof watch>>();
const clients = new Map<string, Set<{ controller: ReadableStreamDefaultController }>>();

export async function GET(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project");
  if (!project) {
    return new Response("Missing project", { status: 400 });
  }

  // Get project path from env
  const projects = JSON.parse(process.env.GSD_PROJECTS || "[]");
  const proj = projects.find((p: { id: string }) => p.id === project);
  if (!proj) {
    return new Response("Unknown project", { status: 404 });
  }

  const planningPath = `${proj.path}/.planning`;

  // Ensure watcher is running
  if (!watchers.has(project)) {
    startWatcher(project, planningPath);
  }

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Register client
      if (!clients.has(project)) clients.set(project, new Set());
      clients.get(project)!.add({ controller });

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`));

      // Keepalive
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 15000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        clients.get(project)?.delete({ controller });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function startWatcher(projectId: string, planningPath: string) {
  const watcher = watch(planningPath, {
    ignoreInitial: true,
    ignored: /(^|[/\\])\../, // ignore dotfiles
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
    persistent: false,
  });

  watcher.on("all", (event, filePath) => {
    const relativePath = filePath.replace(planningPath + "/", "").replace(planningPath + "\\", "");
    broadcast(projectId, {
      type: "file-change",
      event,
      path: relativePath,
      timestamp: Date.now(),
    });
  });

  watchers.set(projectId, watcher);
}

function broadcast(projectId: string, data: Record<string, unknown>) {
  const encoder = new TextEncoder();
  const projectClients = clients.get(projectId);
  if (!projectClients) return;

  const message = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  const dead: ReadableStreamDefaultController[] = [];

  for (const { controller } of projectClients) {
    try {
      controller.enqueue(message);
    } catch {
      dead.push(controller);
    }
  }

  // Cleanup dead clients
  for (const dc of dead) {
    for (const entry of projectClients) {
      if (entry.controller === dc) {
        projectClients.delete(entry);
        break;
      }
    }
  }
}
