import prisma from "./db";
import { QuoteItemType } from "@prisma/client";
import type {
  MetricsRange,
  PlatformMetrics,
  RankedMaterial,
  RankedUser,
  UsagePoint,
} from "./admin-metrics-types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Córdoba, Argentina: UTC-3 fijo (sin horario de verano)
const AR_OFFSET = 3 * HOUR;

const RANGE_CONFIG: Record<MetricsRange, { days: number; label: "DAU" | "WAU" | "MAU" }> = {
  daily: { days: 1, label: "DAU" },
  weekly: { days: 7, label: "WAU" },
  monthly: { days: 30, label: "MAU" },
};

function buildBuckets(range: MetricsRange, now: Date): { start: Date; points: UsagePoint[]; keys: number[] } {
  const keys: number[] = [];
  const points: UsagePoint[] = [];
  const nowMs = now.getTime();

  if (range === "daily") {
    // 24 baldes horarios
    const currentHour = Math.floor((nowMs - AR_OFFSET) / HOUR) * HOUR + AR_OFFSET;
    for (let i = 23; i >= 0; i--) {
      const key = currentHour - i * HOUR;
      keys.push(key);
      const local = new Date(key - AR_OFFSET);
      points.push({ label: `${String(local.getUTCHours()).padStart(2, "0")}:00`, customers: 0 });
    }
    return { start: new Date(keys[0]), points, keys };
  }

  const count = RANGE_CONFIG[range].days;
  const currentDay = Math.floor((nowMs - AR_OFFSET) / DAY) * DAY + AR_OFFSET;
  for (let i = count - 1; i >= 0; i--) {
    const key = currentDay - i * DAY;
    keys.push(key);
    const local = new Date(key - AR_OFFSET);
    points.push({
      label: `${String(local.getUTCDate()).padStart(2, "0")}/${String(local.getUTCMonth() + 1).padStart(2, "0")}`,
      customers: 0,
    });
  }
  return { start: new Date(keys[0]), points, keys };
}

function bucketIndex(date: Date, range: MetricsRange, keys: number[]): number {
  const size = range === "daily" ? HOUR : DAY;
  const key = Math.floor((date.getTime() - AR_OFFSET) / size) * size + AR_OFFSET;
  return keys.indexOf(key);
}

export async function getPlatformMetrics(range: MetricsRange): Promise<PlatformMetrics> {
  const now = new Date();
  const { start, points, keys } = buildBuckets(range, now);
  const activityStart = new Date(now.getTime() - RANGE_CONFIG[range].days * DAY);
  const quoteWhere = { createdAt: { gte: start }, deletedAt: null } as const;

  const [
    activeQuoteOrgs,
    activeCustomerOrgs,
    gmv,
    totalQuotes,
    paidQuotes,
    newCustomers,
    exportGroups,
    materialRows,
    topUserGroups,
  ] = await Promise.all([
    prisma.quote.findMany({
      where: { createdAt: { gte: activityStart }, deletedAt: null },
      select: { organizationId: true },
      distinct: ["organizationId"],
    }),
    prisma.customer.findMany({
      where: { createdAt: { gte: activityStart }, deletedAt: null },
      select: { organizationId: true },
      distinct: ["organizationId"],
    }),
    prisma.quote.aggregate({ where: quoteWhere, _sum: { totalAmount: true } }),
    prisma.quote.count({ where: quoteWhere }),
    prisma.quote.count({
      where: {
        ...quoteWhere,
        job: {
          is: { payments: { some: { paymentMethod: "MERCADO_PAGO", status: "APPROVED" } } },
        },
      },
    }),
    prisma.customer.findMany({
      where: { createdAt: { gte: start }, deletedAt: null },
      select: { createdAt: true },
    }),
    prisma.exportEvent.groupBy({
      by: ["format"],
      where: { createdAt: { gte: start } },
      _count: { _all: true },
    }),
    prisma.quoteItem.groupBy({
      by: ["description"],
      where: { itemType: QuoteItemType.MATERIALS, quote: quoteWhere },
      _sum: { quantity: true },
      _count: { _all: true },
    }),
    prisma.quote.groupBy({
      by: ["organizationId"],
      where: quoteWhere,
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { organizationId: "desc" } },
      take: 3,
    }),
  ]);

  // Electricistas activos: organizaciones con al menos un presupuesto o cliente creado en la ventana
  const activeSet = new Set<string>([
    ...activeQuoteOrgs.map((q) => q.organizationId),
    ...activeCustomerOrgs.map((c) => c.organizationId),
  ]);

  // Curva de uso del CRM
  for (const c of newCustomers) {
    const idx = bucketIndex(c.createdAt, range, keys);
    if (idx >= 0) points[idx].customers += 1;
  }

  // Preferencia de exportación
  const exportCount = (fmt: "PDF" | "DOCX") =>
    exportGroups.find((g) => g.format === fmt)?._count._all ?? 0;

  // Top materiales (unificando variantes de mayúsculas/espacios)
  const merged = new Map<string, RankedMaterial>();
  for (const row of materialRows) {
    const normalized = row.description.trim().replace(/\s+/g, " ");
    const key = normalized.toLowerCase();
    const current = merged.get(key) ?? { name: normalized, quantity: 0, quotes: 0 };
    current.quantity += row._sum.quantity ?? 0;
    current.quotes += row._count._all;
    merged.set(key, current);
  }
  const topMaterials = [...merged.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  // Top usuarios (el presupuesto pertenece a la organización del electricista)
  const orgs = await prisma.organization.findMany({
    where: { id: { in: topUserGroups.map((g) => g.organizationId) } },
    select: { id: true, name: true },
  });
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));
  const topUsers: RankedUser[] = topUserGroups.map((g) => ({
    organizationId: g.organizationId,
    name: orgName.get(g.organizationId) ?? "Sin nombre",
    quotes: g._count._all,
    totalAmount: g._sum.totalAmount ?? 0,
  }));

  return {
    range,
    generatedAt: now.toISOString(),
    activeElectricians: { value: activeSet.size, label: RANGE_CONFIG[range].label },
    theoreticalGmv: gmv._sum.totalAmount ?? 0,
    paymentConversion: {
      percentage: totalQuotes > 0 ? Math.round((paidQuotes / totalQuotes) * 1000) / 10 : 0,
      paidQuotes,
      totalQuotes,
    },
    customerGrowth: points,
    exportPreference: { pdf: exportCount("PDF"), docx: exportCount("DOCX") },
    topMaterials,
    topUsers,
  };
}

