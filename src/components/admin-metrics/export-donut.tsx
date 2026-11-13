"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CARD_CLASS } from "./kpi-card";

export function ExportDonut({ pdf, docx }: { pdf: number; docx: number }) {
  const total = pdf + docx;
  const data = [
    { name: "PDF", value: pdf, color: "#d4a574" },
    { name: "Word", value: docx, color: "#8fa3b8" },
  ];
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <section className={`${CARD_CLASS} p-7`}>
      <h2 className="text-lg font-semibold text-white">Preferencia de exportación</h2>
      <p className="mt-1 text-sm text-white/50">Descargas de presupuestos por formato</p>

      {total === 0 ? (
        <div className="flex h-60 items-center justify-center text-sm text-white/40">
          Sin descargas registradas en el período
        </div>
      ) : (
        <>
          <div className="relative mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={4}
                  cornerRadius={8}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#2c3e50",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 16,
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-white">{total}</span>
              <span className="text-xs text-white/50">descargas</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {data.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-white/70">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-medium text-white">{pct(d.value)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

