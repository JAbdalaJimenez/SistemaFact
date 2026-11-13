import { CARD_CLASS } from "./kpi-card";

export interface RankingRow {
  key: string;
  primary: string;
  secondary?: string;
  value: string;
}

export function RankingList({
  title,
  subtitle,
  rows,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: RankingRow[];
  emptyText: string;
}) {
  return (
    <section className={`${CARD_CLASS} p-7`}>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/50">{subtitle}</p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-white/40">{emptyText}</p>
      ) : (
        <ol className="mt-5 space-y-2">
          {rows.map((row, i) => (
            <li
              key={row.key}
              className="flex items-center gap-4 rounded-2xl bg-white/[0.04] px-4 py-3.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d4a574]/15 text-sm font-semibold text-[#d4a574]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{row.primary}</p>
                {row.secondary && <p className="truncate text-xs text-white/45">{row.secondary}</p>}
              </div>
              <span className="text-sm font-semibold text-white">{row.value}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

