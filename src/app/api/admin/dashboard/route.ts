import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-guard";
import { getPlatformMetricsRaw } from "@/lib/admin-metrics-raw";
import { METRICS_RANGES, type MetricsRange } from "@/lib/admin-metrics-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard?timeframe=daily|weekly|monthly
 * Solo SUPERADMIN (validado contra la DB). Devuelve PlatformMetrics con BigInt ya convertido a Number.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const timeframe = request.nextUrl.searchParams.get("timeframe") ?? "weekly";
    if (!METRICS_RANGES.includes(timeframe as MetricsRange)) {
      return NextResponse.json({ error: "timeframe inválido" }, { status: 400 });
    }

    const metrics = await getPlatformMetricsRaw(timeframe as MetricsRange);
    return NextResponse.json(metrics, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: status === 401 ? "No autenticado" : "Sin permisos" },
        { status }
      );
    }
    console.error("[admin/dashboard] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
