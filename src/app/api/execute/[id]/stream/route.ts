import { NextRequest } from "next/server";
import { getExecutionStatus, onLog, type AgentExecutionEvent } from "@/lib/agent-executor";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const snapshot = getExecutionStatus(id);
  if (!snapshot) {
    return new Response("Execution not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AgentExecutionEvent) => {
        controller.enqueue(encoder.encode(formatSseEvent(event.type, event)));
      };

      controller.enqueue(
        encoder.encode(
          formatSseEvent("status_change", {
            type: "status_change",
            executionId: snapshot.executionId,
            status: snapshot.status,
            timestamp: Date.now(),
          }),
        ),
      );

      // 重连后先回放保留的日志，避免刷新页面丢失执行上下文。
      for (const log of snapshot.logs) {
        send({ type: "log", executionId: snapshot.executionId, log });
      }

      if (snapshot.status === "completed" || snapshot.status === "failed" || snapshot.status === "stopped") {
        send({
          type: "completed",
          executionId: snapshot.executionId,
          status: snapshot.status,
          exitCode: snapshot.exitCode,
          durationMs: snapshot.durationMs,
          timestamp: Date.now(),
        });
      }

      const unsubscribe = onLog(id, send);
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(":keepalive\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        unsubscribe?.();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
