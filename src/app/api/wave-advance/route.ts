import { NextResponse } from "next/server";
import { startExecution } from "@/lib/agent-executor";
import { detectWaveCompletion } from "@/lib/blocker-detector";
import { getDashboardStatus, getPhaseDetail } from "@/lib/gsd-bridge";

export const dynamic = "force-dynamic";

interface WaveAdvanceRequest {
  projectId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WaveAdvanceRequest;
    if (!body.projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const status = await getDashboardStatus(body.projectId);
    const activePhaseNumber =
      status.state.currentPhase ?? status.phases.find((phase) => phase.status === "in_progress")?.number;

    if (!activePhaseNumber) {
      return NextResponse.json({ error: "未找到当前进行中的 Phase" }, { status: 409 });
    }

    const phaseDetail = await getPhaseDetail(activePhaseNumber, body.projectId);
    const completion = detectWaveCompletion(status, phaseDetail);

    if (!completion?.canAdvance || !completion.nextPlan) {
      return NextResponse.json(
        {
          error: completion?.reason ?? "当前 Wave 尚不可推进",
          waveCompletion: completion,
        },
        { status: 409 },
      );
    }

    const execution = await startExecution({
      command: "execute-plan",
      projectId: body.projectId,
      args: [String(completion.phase), String(completion.nextPlan)],
      confirmed: true,
      triggeredBy: `wave-auto-advance:${completion.wave}->${completion.nextWave}`,
    });

    return NextResponse.json({
      waveCompletion: completion,
      execution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /already has a running execution/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
