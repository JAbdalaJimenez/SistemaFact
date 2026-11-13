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
      className="inline-flex rounded-full bg-black/20 p-1 ring-1 ring-white/10"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-[#d4a574] text-[#2c3e50] shadow-md"
                : "text-white/60 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

