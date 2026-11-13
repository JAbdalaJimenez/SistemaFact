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
    <section className={`${CARD_CLASS} overflow-hidden`}>
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0]">
        <h2 className="text-base font-semibold text-[#0B132B]">{title}</h2>
        <p className="mt-0.5 text-xs text-[#475569]">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#64748B]">{emptyText}</div>
      ) : (
        <ol className="divide-y divide-[#E2E8F0]">
          {rows.map((row, i) => (
            <li
              key={row.key}
              className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5 hover:bg-[#F8FAFC] transition-colors"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B132B] border border-[#1C2541] text-xs font-semibold text-[#C5A059] tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0B132B]">{row.primary}</p>
                {row.secondary && (
                  <p className="truncate text-xs text-[#475569] font-normal">{row.secondary}</p>
                )}
              </div>
              <span className="shrink-0 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 text-xs font-semibold text-[#0B132B] tabular-nums">
                {row.value}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
