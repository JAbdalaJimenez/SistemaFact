"use client";

import type { MetricsRange } from "@/lib/admin-metrics-types";

const OPTIONS: { value: MetricsRange; label: string }[] = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
];

export function SegmentedControl({
  value,
  onChange,
  disabled,
}: {
  value: MetricsRange;
  onChange: (value: MetricsRange) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Período"
      className="inline-flex rounded-xl bg-[#1C2541] p-1 border border-[#2A3B5C]"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
              active
                ? "bg-[#C5A059] text-[#0B132B] font-semibold shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-white/5 font-medium"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
