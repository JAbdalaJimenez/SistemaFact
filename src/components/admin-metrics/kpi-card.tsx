import type { ReactNode } from "react";

export const CARD_CLASS =
  "rounded-2xl bg-white border border-[#E2E8F0] shadow-sm";

export function KpiCard({
  title,
  value,
  caption,
  icon,
  featured = false,
}: {
  title: string;
  value: string;
  caption?: string;
  icon: ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`${CARD_CLASS} p-5 flex flex-col justify-between ${
        featured ? "border-[#C5A059]/60" : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
            {title}
          </span>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              featured
                ? "bg-[#0B132B] border-[#1C2541] text-[#C5A059]"
                : "bg-[#F8FAFC] border-[#E2E8F0] text-[#9A6E24]"
            }`}
          >
            {icon}
          </span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[#0B132B] tabular-nums">
          {value}
        </p>
      </div>
      {caption && (
        <p className="mt-4 pt-3 border-t border-[#E2E8F0] text-xs text-[#475569] font-normal">
          {caption}
        </p>
      )}
    </div>
  );
}
