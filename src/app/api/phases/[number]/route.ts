import { NextRequest, NextResponse } from "next/server";
import { getPhaseDetail } from "@/lib/gsd-bridge";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const phaseNumber = Number(number);
  const project = request.nextUrl.searchParams.get("project") ?? undefined;

  if (!Number.isInteger(phaseNumber) || phaseNumber < 1) {
    return NextResponse.json({ error: "无效的 Phase 编号" }, { status: 400 });
  }

  try {
    const phase = await getPhaseDetail(phaseNumber, project);
    if (!phase) {
      return NextResponse.json({ error: "未找到 Phase" }, { status: 404 });
    }

    return NextResponse.json(phase, {
      headers: {
        // 前端轮询使用最新文件状态。
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "读取 Phase 详情失败",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
