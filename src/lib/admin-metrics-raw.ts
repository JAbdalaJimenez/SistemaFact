import prisma from "./db";
import {
  METRICS_RANGES,
  type MetricsRange,
  type PlatformMetrics,
  type RankedMaterial,
  type RankedUser,
  type UsagePoint,
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
  return { start: new Date(keys[0] + AR_OFFSET), keys, points };
}

interface RawAllRow {
  range_key: MetricsRange;
  active_orgs: bigint | number;
  gmv: bigint | number;
  total_quotes: bigint | number;
  paid_quotes: bigint | number;
  growth_json: Array<{ bucket: string; total: number }> | null;
  exports_json: Array<{ format: string; total: number }> | null;
  materials_json: Array<{ name: string; quantity: number; quotes: number }> | null;
  top_users_json: Array<{ id: string; name: string; quotes: number; total: number }> | null;
}

function hydrateRow(
  row: RawAllRow | undefined,
  range: MetricsRange,
  buckets: { keys: number[]; points: UsagePoint[] },
  now: Date
): PlatformMetrics {
  const points = buckets.points.map((p) => ({ ...p }));
  const growthRows = Array.isArray(row?.growth_json) ? row.growth_json : [];
  const exportRows = Array.isArray(row?.exports_json) ? row.exports_json : [];
  const materialRows = Array.isArray(row?.materials_json) ? row.materials_json : [];
  const userRows = Array.isArray(row?.top_users_json) ? row.top_users_json : [];

  for (const g of growthRows) {
    const bucketStr = String(g.bucket).endsWith("Z") ? String(g.bucket) : `${g.bucket}Z`;
    const idx = buckets.keys.indexOf(new Date(bucketStr).getTime());
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

/**
 * Ejecuta una única consulta SQL para calcular los 3 rangos (daily, weekly, monthly)
 * leyendo cada tabla base 1 sola vez sobre la ventana máxima.
 */
export async function getAllPlatformMetricsRaw(): Promise<Record<MetricsRange, PlatformMetrics>> {
  const now = new Date();
  const bucketsByRange = {
    daily: buildBuckets("daily", now),
    weekly: buildBuckets("weekly", now),
    monthly: buildBuckets("monthly", now),
  };

  const dailyStart = bucketsByRange.daily.start;
  const weeklyStart = bucketsByRange.weekly.start;
  const monthlyStart = bucketsByRange.monthly.start;

  const dailyAct = new Date(now.getTime() - DAY);
  const weeklyAct = new Date(now.getTime() - 7 * DAY);
  const monthlyAct = new Date(now.getTime() - 30 * DAY);

  const rows = await prisma.$queryRaw<RawAllRow[]>`
    WITH
      ranges AS (
        SELECT 'daily'::text AS range_key, ${dailyStart}::timestamptz AS b_start, ${dailyAct}::timestamptz AS a_start, 'hour'::text AS unit
        UNION ALL
        SELECT 'weekly'::text, ${weeklyStart}::timestamptz, ${weeklyAct}::timestamptz, 'day'::text
        UNION ALL
        SELECT 'monthly'::text, ${monthlyStart}::timestamptz, ${monthlyAct}::timestamptz, 'day'::text
      ),
      base_quotes AS (
        SELECT
          q.id,
          q."organizationId",
          q."totalAmount",
          q."createdAt",
          EXISTS (
            SELECT 1 FROM jobs j
            JOIN payments p ON p."jobId" = j.id
            WHERE j."quoteId" = q.id
              AND p."paymentMethod" = 'MERCADO_PAGO'
              AND p.status = 'APPROVED'
          ) AS is_paid
        FROM quotes q
        WHERE q."createdAt" >= LEAST(${monthlyStart}::timestamptz, ${monthlyAct}::timestamptz)
          AND q."deletedAt" IS NULL
      ),
      base_customers AS (
        SELECT "organizationId", "createdAt"
        FROM customers
        WHERE "createdAt" >= LEAST(${monthlyStart}::timestamptz, ${monthlyAct}::timestamptz)
          AND "deletedAt" IS NULL
      ),
      base_exports AS (
        SELECT format::text AS format, "createdAt"
        FROM export_events
        WHERE "createdAt" >= ${monthlyStart}::timestamptz
      ),
      base_materials AS (
        SELECT
          q."createdAt",
          TRIM(regexp_replace(qi.description, '[[:space:]]+', ' ', 'g')) AS raw_name,
          LOWER(TRIM(regexp_replace(qi.description, '[[:space:]]+', ' ', 'g'))) AS norm_key,
          qi.quantity
        FROM quote_items qi
        JOIN base_quotes q ON q.id = qi."quoteId"
        WHERE qi."itemType" = 'MATERIALS'
          AND q."createdAt" >= ${monthlyStart}::timestamptz
      )
    SELECT
      r.range_key,
      (
        SELECT COUNT(*)::bigint FROM (
          SELECT "organizationId" FROM base_quotes WHERE "createdAt" >= r.a_start
          UNION
          SELECT "organizationId" FROM base_customers WHERE "createdAt" >= r.a_start
        ) ao
      ) AS active_orgs,
      COALESCE((SELECT SUM("totalAmount") FROM base_quotes WHERE "createdAt" >= r.b_start), 0)::bigint AS gmv,
      (SELECT COUNT(*) FROM base_quotes WHERE "createdAt" >= r.b_start)::bigint AS total_quotes,
      (SELECT COUNT(*) FROM base_quotes WHERE "createdAt" >= r.b_start AND is_paid)::bigint AS paid_quotes,
      COALESCE((
        SELECT json_agg(t) FROM (
          SELECT date_trunc(r.unit, ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${AR_TZ}) AS bucket,
                 COUNT(*)::int AS total
          FROM base_customers
          WHERE "createdAt" >= r.b_start
          GROUP BY 1
        ) t
      ), '[]'::json) AS growth_json,
      COALESCE((
        SELECT json_agg(t) FROM (
          SELECT format, COUNT(*)::int AS total
          FROM base_exports
          WHERE "createdAt" >= r.b_start
          GROUP BY format
        ) t
      ), '[]'::json) AS exports_json,
      COALESCE((
        SELECT json_agg(t) FROM (
          SELECT MIN(raw_name) AS name, COALESCE(SUM(quantity), 0)::int AS quantity, COUNT(*)::int AS quotes
          FROM base_materials
          WHERE "createdAt" >= r.b_start
          GROUP BY norm_key
          ORDER BY quantity DESC
          LIMIT 5
        ) t
      ), '[]'::json) AS materials_json,
      COALESCE((
        SELECT json_agg(t) FROM (
          SELECT q."organizationId" AS id, o.name AS name,
                 COUNT(*)::int AS quotes, COALESCE(SUM(q."totalAmount"), 0)::bigint AS total
          FROM base_quotes q
          JOIN organizations o ON o.id = q."organizationId"
          WHERE q."createdAt" >= r.b_start
          GROUP BY q."organizationId", o.name
          ORDER BY quotes DESC
          LIMIT 3
        ) t
      ), '[]'::json) AS top_users_json
    FROM ranges r
  `;

  const byKey = new Map(rows.map((r) => [r.range_key, r]));
  const result = {} as Record<MetricsRange, PlatformMetrics>;
  for (const key of METRICS_RANGES) {
    result[key] = hydrateRow(byKey.get(key), key, bucketsByRange[key], now);
  }
  return result;
}

export async function getPlatformMetricsRaw(range: MetricsRange): Promise<PlatformMetrics> {
  const all = await getAllPlatformMetricsRaw();
  return all[range];
}
