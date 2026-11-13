"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowLeft, Banknote, BarChart3, Percent, ShieldCheck, Users } from "lucide-react";
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
  DAU: "Organizaciones activas en las últimas 24 horas",
  WAU: "Organizaciones activas en los últimos 7 días",
  MAU: "Organizaciones activas en los últimos 30 días",
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
    <div className="space-y-6 font-sans">
      {/* ENCABEZADO INSTITUCIONAL - OXFORD & GOLD */}
      <div className="bg-[#0B132B] rounded-2xl p-5 sm:p-6 text-white shadow-sm border border-[#1C2541] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A6E24] via-[#C5A059] to-[#9A6E24]" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Link
              href="/dashboard"
              prefetch={true}
              aria-label="Volver al Dashboard"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1C2541] border border-[#2A3B5C] text-slate-300 hover:text-white hover:border-[#C5A059]/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#1C2541] border border-[#C5A059]/40 text-[#C5A059] text-[10px] font-semibold px-2.5 py-0.5 rounded tracking-wider uppercase inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                  <span>Acceso Superadmin</span>
                </span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#C5A059]" strokeWidth={1.75} />
                <span>Métricas de Plataforma</span>
              </h1>
              <p className="mt-0.5 text-xs text-slate-400 font-normal">
                Actividad general, facturación estimada y conversión de cobranzas en ElectroCba
              </p>
            </div>
          </div>

          <div className="self-start sm:self-center">
            <SegmentedControl value={range} onChange={changeRange} disabled={loading} />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <div className={`space-y-6 transition-opacity duration-150 ${loading ? "opacity-60" : ""}`}>
        {/* TARJETAS KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            featured
            title={`Electricistas activos (${data.activeElectricians.label})`}
            value={integer.format(data.activeElectricians.value)}
            caption={ACTIVE_CAPTION[data.activeElectricians.label]}
            icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
          />
          <KpiCard
            title="Monto presupuestado"
            value={currency.format(data.theoreticalGmv)}
            caption="GMV teórico acumulado del período"
            icon={<Banknote className="h-4 w-4" strokeWidth={1.75} />}
          />
          <KpiCard
            title="Conversión de pagos"
            value={`${conv.percentage.toLocaleString("es-AR")}%`}
            caption={`${conv.paidQuotes} de ${conv.totalQuotes} cobrados vía Mercado Pago`}
            icon={<Percent className="h-4 w-4" strokeWidth={1.75} />}
          />
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <UsageChart data={data.customerGrowth} />
          <ExportDonut pdf={data.exportPreference.pdf} docx={data.exportPreference.docx} />
        </div>

        {/* RANKINGS OPERATIVOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
  );
}
