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

interface RawCteRow {
  active_orgs: bigint | number;
  gmv: bigint | number;
  total_quotes: bigint | number;
  paid_quotes: bigint | number;
  growth_json: Array<{ bucket: string; total: number }> | null;
  exports_json: Array<{ format: string; total: number }> | null;
  materials_json: Array<{ name: string; quantity: number; quotes: number }> | null;
  top_users_json: Array<{ id: string; name: string; quotes: number; total: number }> | null;
}

export async function getPlatformMetricsRaw(range: MetricsRange): Promise<PlatformMetrics> {
  const now = new Date();
  const { start, keys, points } = buildBuckets(range, now);
  const activityStart = new Date(now.getTime() - RANGE_CONFIG[range].days * DAY);
  const unit = range === "daily" ? "hour" : "day";

  const rows = await prisma.$queryRaw<RawCteRow[]>`
    WITH
      active_orgs AS (
        SELECT COUNT(*)::bigint AS total FROM (
          SELECT "organizationId" FROM quotes
            WHERE "createdAt" >= ${activityStart} AND "deletedAt" IS NULL
          UNION
          SELECT "organizationId" FROM customers
            WHERE "createdAt" >= ${activityStart} AND "deletedAt" IS NULL
        ) t
      ),
      quote_totals AS (
        SELECT
          COALESCE(SUM(q."totalAmount"), 0)::bigint AS gmv,
          COUNT(*)::bigint AS total_quotes,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM jobs j
            JOIN payments p ON p."jobId" = j.id
            WHERE j."quoteId" = q.id
              AND p."paymentMethod" = 'MERCADO_PAGO'
              AND p.status = 'APPROVED'
          ))::bigint AS paid_quotes
        FROM quotes q
        WHERE q."createdAt" >= ${start} AND q."deletedAt" IS NULL
      ),
      growth AS (
        SELECT
          date_trunc(${unit}, ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${AR_TZ}) AS bucket,
          COUNT(*)::int AS total
        FROM customers
        WHERE "createdAt" >= ${start} AND "deletedAt" IS NULL
        GROUP BY 1
      ),
      exports AS (
        SELECT format::text AS format, COUNT(*)::int AS total
        FROM export_events
        WHERE "createdAt" >= ${start}
        GROUP BY format
      ),
      materials AS (
        SELECT
          MIN(TRIM(regexp_replace(qi.description, '[[:space:]]+', ' ', 'g'))) AS name,
          COALESCE(SUM(qi.quantity), 0)::int AS quantity,
          COUNT(*)::int AS quotes
        FROM quote_items qi
        JOIN quotes q ON q.id = qi."quoteId"
        WHERE qi."itemType" = 'MATERIALS'
          AND q."createdAt" >= ${start} AND q."deletedAt" IS NULL
        GROUP BY LOWER(TRIM(regexp_replace(qi.description, '[[:space:]]+', ' ', 'g')))
        ORDER BY quantity DESC
        LIMIT 5
      ),
      top_users AS (
        SELECT
          q."organizationId" AS id,
          o.name AS name,
          COUNT(*)::int AS quotes,
          COALESCE(SUM(q."totalAmount"), 0)::bigint AS total
        FROM quotes q
        JOIN organizations o ON o.id = q."organizationId"
        WHERE q."createdAt" >= ${start} AND q."deletedAt" IS NULL
        GROUP BY q."organizationId", o.name
        ORDER BY quotes DESC
        LIMIT 3
      )
    SELECT
      (SELECT total FROM active_orgs) AS active_orgs,
      (SELECT gmv FROM quote_totals) AS gmv,
      (SELECT total_quotes FROM quote_totals) AS total_quotes,
      (SELECT paid_quotes FROM quote_totals) AS paid_quotes,
      (SELECT COALESCE(json_agg(growth), '[]'::json) FROM growth) AS growth_json,
      (SELECT COALESCE(json_agg(exports), '[]'::json) FROM exports) AS exports_json,
      (SELECT COALESCE(json_agg(materials), '[]'::json) FROM materials) AS materials_json,
      (SELECT COALESCE(json_agg(top_users), '[]'::json) FROM top_users) AS top_users_json
  `;

  const row = rows[0];
  const growthRows = Array.isArray(row?.growth_json) ? row.growth_json : [];
  const exportRows = Array.isArray(row?.exports_json) ? row.exports_json : [];
  const materialRows = Array.isArray(row?.materials_json) ? row.materials_json : [];
  const userRows = Array.isArray(row?.top_users_json) ? row.top_users_json : [];

  for (const g of growthRows) {
    // `bucket` viene serializado como timestamp sin zona (hora local de Córdoba) -> interpretarlo en UTC pared
    const bucketStr = String(g.bucket).endsWith("Z") ? String(g.bucket) : `${g.bucket}Z`;
    const idx = keys.indexOf(new Date(bucketStr).getTime());
    if (idx >= 0) points[idx].customers = num(g.total);
  }

  const totalQuotes = num(row?.total_quotes);
  const paidQuotes = num(row?.paid_quotes);
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
    activeElectricians: { value: num(row?.active_orgs), label: RANGE_CONFIG[range].label },
    theoreticalGmv: num(row?.gmv),
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

export async function getAllPlatformMetricsRaw(): Promise<Record<MetricsRange, PlatformMetrics>> {
  const [daily, weekly, monthly] = await Promise.all([
    getPlatformMetricsRaw("daily"),
    getPlatformMetricsRaw("weekly"),
    getPlatformMetricsRaw("monthly"),
  ]);
  return { daily, weekly, monthly };
}
