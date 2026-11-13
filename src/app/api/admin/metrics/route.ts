import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-guard";
import { getPlatformMetrics } from "@/lib/admin-metrics";
import { METRICS_RANGES, type MetricsRange } from "@/lib/admin-metrics-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const raw = request.nextUrl.searchParams.get("range") ?? "weekly";
    if (!METRICS_RANGES.includes(raw as MetricsRange)) {
      return NextResponse.json({ error: "Rango inválido" }, { status: 400 });
    }

    const metrics = await getPlatformMetrics(raw as MetricsRange);
    return NextResponse.json(metrics, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: status === 401 ? "No autenticado" : "Sin permisos" },
        { status }
      );
    }
    console.error("[admin/metrics] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

