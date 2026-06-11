import { NextResponse } from "next/server";
import { getDashboardStatus } from "@/lib/gsd-bridge";
import { detectBlockers, detectWaveCompletion } from "@/lib/blocker-detector";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project");
  if (!project) {
    return NextResponse.json({ error: "Missing project" }, { status: 400 });
  }

  try {
    const status = await getDashboardStatus(project);
    const blockers = detectBlockers(status);
    const waveCompletion = detectWaveCompletion(status);

    return NextResponse.json({
      blockers,
      waveCompletion,
      summary: {
        total: blockers.length,
        critical: blockers.filter((b) => b.severity === "critical").length,
        warning: blockers.filter((b) => b.severity === "warning").length,
        info: blockers.filter((b) => b.severity === "info").length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
