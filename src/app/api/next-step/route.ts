import { NextResponse } from "next/server";
import { getDashboardStatus } from "@/lib/gsd-bridge";
import { getPrimaryNextStep, suggestNextSteps } from "@/lib/next-step-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project");

  try {
    const status = await getDashboardStatus(project || undefined);
    const primary = getPrimaryNextStep(status);
    const allSteps = suggestNextSteps(status);

    return NextResponse.json({
      primary,
      allSteps,
      currentState: status.state.status,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "获取下一步建议失败", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
