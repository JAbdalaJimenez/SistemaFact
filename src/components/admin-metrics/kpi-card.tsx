import type { ReactNode } from "react";

export const CARD_CLASS =
  "rounded-[28px] bg-white/[0.06] ring-1 ring-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm";

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
      className={`${CARD_CLASS} ${featured ? "bg-white/[0.10] p-9 md:col-span-2" : "p-7"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium uppercase tracking-wider text-white/60">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d4a574]/15 text-[#d4a574]">
          {icon}
        </span>
      </div>
      <p
        className={`mt-5 font-semibold tracking-tight text-white ${
          featured ? "text-6xl" : "text-4xl"
        }`}
      >
        {value}
      </p>
      {caption && <p className="mt-2 text-sm text-white/50">{caption}</p>}
    </div>
  );
}

