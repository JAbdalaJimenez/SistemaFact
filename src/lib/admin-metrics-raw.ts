import prisma from "./db";
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
const AR_TZ = "America/Argentina/Cordoba";

const RANGE_CONFIG: Record<MetricsRange, { days: number; label: "DAU" | "WAU" | "MAU" }> = {
  daily: { days: 1, label: "DAU" },
  weekly: { days: 7, label: "WAU" },
  monthly: { days: 30, label: "MAU" },
};

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Baldes de tiempo en hora local de Córdoba. `key` = ms "de pared" (hora local expresada como UTC). */
function buildBuckets(range: MetricsRange, now: Date) {
  const size = range === "daily" ? HOUR : DAY;
  const count = range === "daily" ? 24 : RANGE_CONFIG[range].days;
  const currentLocal = Math.floor((now.getTime() - AR_OFFSET) / size) * size;

  const keys: number[] = [];
  const points: UsagePoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = currentLocal - i * size;
    keys.push(key);
    const d = new Date(key);
    points.push({
      label:
        range === "daily"
          ? `${String(d.getUTCHours()).padStart(2, "0")}:00`
          : `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      customers: 0,
    });
  }
  // Inicio real (UTC) del primer balde
  return { start: new Date(keys[0] + AR_OFFSET), keys, points };
}

export async function getPlatformMetricsRaw(range: MetricsRange): Promise<PlatformMetrics> {
  const now = new Date();
  const { start, keys, points } = buildBuckets(range, now);
  const activityStart = new Date(now.getTime() - RANGE_CONFIG[range].days * DAY);
  const unit = range === "daily" ? "hour" : "day";

  const [activeRows, totalsRows, growthRows, exportRows, materialRows, userRows] =
    await Promise.all([
      // Electricistas activos: organizaciones con presupuesto o cliente creado en la ventana
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*)::bigint AS total FROM (
          SELECT "organizationId" FROM quotes
            WHERE "createdAt" >= ${activityStart} AND "deletedAt" IS NULL
          UNION
          SELECT "organizationId" FROM customers
            WHERE "createdAt" >= ${activityStart} AND "deletedAt" IS NULL
        ) t`,
      // GMV teórico, total de cotizaciones y cotizaciones cobradas por Mercado Pago
      prisma.$queryRaw<{ gmv: bigint; total: bigint; paid: bigint }[]>`
        SELECT
          COALESCE(SUM(q."totalAmount"), 0)::bigint AS gmv,
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM jobs j
            JOIN payments p ON p."jobId" = j.id
            WHERE j."quoteId" = q.id
              AND p."paymentMethod" = 'MERCADO_PAGO'
              AND p.status = 'APPROVED'
          ))::bigint AS paid
        FROM quotes q
        WHERE q."createdAt" >= ${start} AND q."deletedAt" IS NULL`,
      // Clientes nuevos por balde (hora local de Córdoba)
      prisma.$queryRaw<{ bucket: Date; total: bigint }[]>`
        SELECT date_trunc(${unit}, ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${AR_TZ}) AS bucket,
               COUNT(*)::bigint AS total
        FROM customers
        WHERE "createdAt" >= ${start} AND "deletedAt" IS NULL
        GROUP BY 1`,
      prisma.$queryRaw<{ format: string; total: bigint }[]>`
        SELECT format::text AS format, COUNT(*)::bigint AS total
        FROM export_events
        WHERE "createdAt" >= ${start}
        GROUP BY format`,
      prisma.$queryRaw<{ name: string; quantity: bigint; quotes: bigint }[]>`
        SELECT MIN(TRIM(regexp_replace(qi.description, '[[:space:]]+', ' ', 'g'))) AS name,
               COALESCE(SUM(qi.quantity), 0)::bigint AS quantity,
               COUNT(*)::bigint AS quotes
        FROM quote_items qi
        JOIN quotes q ON q.id = qi."quoteId"
        WHERE qi."itemType" = 'MATERIALS'
          AND q."createdAt" >= ${start} AND q."deletedAt" IS NULL
        GROUP BY LOWER(TRIM(regexp_replace(qi.description, '[[:space:]]+', ' ', 'g')))
        ORDER BY quantity DESC
        LIMIT 5`,
      // El presupuesto pertenece a la organización del electricista (quotes no guarda el usuario creador)
      prisma.$queryRaw<{ id: string; name: string; quotes: bigint; total: bigint }[]>`
        SELECT q."organizationId" AS id, o.name AS name,
               COUNT(*)::bigint AS quotes,
               COALESCE(SUM(q."totalAmount"), 0)::bigint AS total
        FROM quotes q
        JOIN organizations o ON o.id = q."organizationId"
        WHERE q."createdAt" >= ${start} AND q."deletedAt" IS NULL
        GROUP BY q."organizationId", o.name
        ORDER BY quotes DESC
        LIMIT 3`,
    ]);

  for (const row of growthRows) {
    const idx = keys.indexOf(new Date(row.bucket).getTime());
    if (idx >= 0) points[idx].customers = num(row.total);
  }

  const totals = totalsRows[0];
  const totalQuotes = num(totals?.total);
  const paidQuotes = num(totals?.paid);
  const exportCount = (f: string) => num(exportRows.find((r) => r.format === f)?.total);

  const topMaterials: RankedMaterial[] = materialRows.map((r) => ({
    name: r.name,
    quantity: num(r.quantity),
    quotes: num(r.quotes),
  }));
  const topUsers: RankedUser[] = userRows.map((r) => ({
    organizationId: r.id,
    name: r.name || "Sin nombre",
    quotes: num(r.quotes),
    totalAmount: num(r.total),
  }));

  return {
    range,
    generatedAt: now.toISOString(),
    activeElectricians: { value: num(activeRows[0]?.total), label: RANGE_CONFIG[range].label },
    theoreticalGmv: num(totals?.gmv),
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
