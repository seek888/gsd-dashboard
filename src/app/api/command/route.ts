import { NextResponse } from "next/server";
import { executeGsdCommand, appendAuditLog, readAuditLog } from "@/lib/command-runner";
import type { GsdCommandId } from "@/lib/command-types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { commandId, projectId, extraArgs, confirmed } = body as {
      commandId: GsdCommandId;
      projectId: string;
      extraArgs?: string[];
      confirmed?: boolean;
    };

    if (!commandId || !projectId) {
      return NextResponse.json({ error: "Missing commandId or projectId" }, { status: 400 });
    }

    // Execute the command
    const result = await executeGsdCommand(commandId, projectId, extraArgs);

    // Log to audit trail
    await appendAuditLog({
      command: commandId,
      args: extraArgs || [],
      projectId,
      result: result.success ? "success" : "failure",
      durationMs: result.durationMs,
      stdout: result.success ? result.stdout.substring(0, 2000) : undefined,
      stderr: result.success ? undefined : result.stderr.substring(0, 2000),
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Return audit log
  const logs = await readAuditLog();
  return NextResponse.json({ logs });
}
