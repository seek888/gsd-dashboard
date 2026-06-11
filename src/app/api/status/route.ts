import { NextRequest, NextResponse } from "next/server";
import { getDashboardStatus } from "@/lib/gsd-bridge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project") ?? undefined;

  try {
    const status = await getDashboardStatus(project);
    return NextResponse.json(status, {
      headers: {
        // 前端每 5 秒轮询，接口本身保持无缓存。
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "读取 GSD 项目状态失败",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
