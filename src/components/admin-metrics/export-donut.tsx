"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CARD_CLASS } from "./kpi-card";

export function ExportDonut({ pdf, docx }: { pdf: number; docx: number }) {
  const total = pdf + docx;
  const data = [
    { name: "PDF", value: pdf, color: "#0B132B" },
    { name: "Word", value: docx, color: "#C5A059" },
  ];
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <section className={`${CARD_CLASS} overflow-hidden flex flex-col justify-between`}>
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0]">
        <h2 className="text-base font-semibold text-[#0B132B]">Preferencia de exportación</h2>
        <p className="mt-0.5 text-xs text-[#475569]">Descargas de presupuestos por formato</p>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
        {total === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-xl bg-[#F8FAFC] border border-dashed border-[#E2E8F0] px-4 text-center text-xs text-[#64748B]">
            Sin descargas registradas en el período
          </div>
        ) : (
          <>
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={4}
                    cornerRadius={6}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {data.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0B132B",
                      border: "1px solid #1C2541",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#0B132B] tabular-nums">{total}</span>
                <span className="text-[11px] font-medium text-[#64748B]">descargas</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {data.map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 font-medium text-[#0B132B]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-semibold text-[#0B132B] tabular-nums">
                    {d.value} ({pct(d.value)}%)
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
