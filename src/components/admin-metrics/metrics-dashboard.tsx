"use client";

import { useCallback, useRef, useState } from "react";
import { Banknote, Percent, Users } from "lucide-react";
import type { MetricsRange, PlatformMetrics } from "@/lib/admin-metrics-types";
import { SegmentedControl } from "./segmented-control";
import { KpiCard } from "./kpi-card";
import { UsageChart } from "./usage-chart";
import { ExportDonut } from "./export-donut";
import { RankingList } from "./ranking-list";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("es-AR");

const ACTIVE_CAPTION: Record<string, string> = {
  DAU: "Activos en las últimas 24 horas",
  WAU: "Activos en los últimos 7 días",
  MAU: "Activos en los últimos 30 días",
};

export function MetricsDashboard({
  initialData,
  initialAllData,
}: {
  initialData: PlatformMetrics;
  initialAllData?: Partial<Record<MetricsRange, PlatformMetrics>>;
}) {
  const [range, setRange] = useState<MetricsRange>(initialData.range);
  const [data, setData] = useState<PlatformMetrics>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Partial<Record<MetricsRange, PlatformMetrics>>>({
    ...initialAllData,
    [initialData.range]: initialData,
  });
  const activeRangeRef = useRef<MetricsRange>(initialData.range);

  const changeRange = useCallback(async (next: MetricsRange) => {
    activeRangeRef.current = next;
    setRange(next);
    setError(null);

    const cached = cacheRef.current[next];
    if (cached) {
      // Cambio instantáneo en memoria (0 ms), y refresco silencioso en segundo plano
      setData(cached);
      setLoading(false);
      fetch(`/api/admin/dashboard?timeframe=${next}`, { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<PlatformMetrics>) : null))
        .then((fresh) => {
          if (!fresh) return;
          cacheRef.current[next] = fresh;
          if (activeRangeRef.current === next) {
            setData(fresh);
          }
        })
        .catch(() => {});
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard?timeframe=${next}`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 403 ? "Sin permisos" : "No se pudieron cargar las métricas");
      const fresh = (await res.json()) as PlatformMetrics;
      cacheRef.current[next] = fresh;
      if (activeRangeRef.current === next) {
        setData(fresh);
      }
    } catch (e) {
      if (activeRangeRef.current === next) {
        setError(e instanceof Error ? e.message : "Error al cargar las métricas");
      }
    } finally {
      if (activeRangeRef.current === next) {
        setLoading(false);
      }
    }
  }, []);

  const conv = data.paymentConversion;

  return (
    <div
      className="min-h-screen bg-[#2c3e50] px-5 py-10 text-white sm:px-8"
      style={{
        fontFamily:
          '"Inter", "Helvetica Neue", "Neue Haas Grotesk", Helvetica, Arial, system-ui, sans-serif',
      }}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Métricas de Plataforma</h1>
            <p className="mt-1 text-sm text-white/50">Vista exclusiva de administración</p>
          </div>
          <SegmentedControl value={range} onChange={changeRange} disabled={loading} />
        </header>

        {error && (
          <div className="rounded-2xl bg-red-500/10 px-5 py-3 text-sm text-red-200 ring-1 ring-red-400/30">
            {error}
          </div>
        )}

        <div className={`space-y-8 transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              featured
              title={`Electricistas activos (${data.activeElectricians.label})`}
              value={integer.format(data.activeElectricians.value)}
              caption={ACTIVE_CAPTION[data.activeElectricians.label]}
              icon={<Users className="h-5 w-5" />}
            />
            <KpiCard
              title="Monto presupuestado"
              value={currency.format(data.theoreticalGmv)}
              caption="GMV teórico del período"
              icon={<Banknote className="h-5 w-5" />}
            />
            <KpiCard
              title="Conversión de pagos"
              value={`${conv.percentage.toLocaleString("es-AR")}%`}
              caption={`${conv.paidQuotes} de ${conv.totalQuotes} cobrados vía Mercado Pago`}
              icon={<Percent className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <UsageChart data={data.customerGrowth} />
            <ExportDonut pdf={data.exportPreference.pdf} docx={data.exportPreference.docx} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <RankingList
              title="Top 5 materiales"
              subtitle="Más presupuestados en la plataforma"
              emptyText="Sin materiales presupuestados en el período"
              rows={data.topMaterials.map((m) => ({
                key: m.name.toLowerCase(),
                primary: m.name,
                secondary: `${m.quotes} presupuesto${m.quotes === 1 ? "" : "s"}`,
                value: `${integer.format(m.quantity)} u.`,
              }))}
            />
            <RankingList
              title="Top 3 usuarios"
              subtitle="Mayor volumen de cotizaciones generadas"
              emptyText="Sin cotizaciones en el período"
              rows={data.topUsers.map((u) => ({
                key: u.organizationId,
                primary: u.name,
                secondary: currency.format(u.totalAmount),
                value: `${integer.format(u.quotes)} cotiz.`,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
