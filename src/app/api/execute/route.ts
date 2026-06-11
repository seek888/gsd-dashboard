import { NextResponse } from "next/server";
import { getExecutionStatus, startExecution, stopExecution } from "@/lib/agent-executor";

export const dynamic = "force-dynamic";

interface ExecuteRequestBody {
  action: "start" | "stop" | "status";
  command?: string;
  projectId?: string;
  args?: string[];
  executionId?: string;
  confirmed?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExecuteRequestBody;
    const action = body.action;

    if (action === "start") {
      if (!body.command || !body.projectId) {
        return NextResponse.json({ error: "Missing command or projectId" }, { status: 400 });
      }

      const execution = await startExecution({
        command: body.command,
        projectId: body.projectId,
        args: body.args ?? [],
        confirmed: body.confirmed,
      });

      return NextResponse.json({ execution });
    }

    if (action === "stop") {
      if (!body.executionId) {
        return NextResponse.json({ error: "Missing executionId" }, { status: 400 });
      }

      const execution = stopExecution(body.executionId);
      if (!execution) {
        return NextResponse.json({ error: "Execution not found" }, { status: 404 });
      }

      return NextResponse.json({ execution });
    }

    if (action === "status") {
      if (!body.executionId) {
        return NextResponse.json({ error: "Missing executionId" }, { status: 400 });
      }

      const execution = getExecutionStatus(body.executionId);
      if (!execution) {
        return NextResponse.json({ error: "Execution not found" }, { status: 404 });
      }

      return NextResponse.json({ execution }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /already has a running execution/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
