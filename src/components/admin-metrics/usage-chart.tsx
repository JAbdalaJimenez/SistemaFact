"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsagePoint } from "@/lib/admin-metrics-types";
import { CARD_CLASS } from "./kpi-card";

export function UsageChart({ data }: { data: UsagePoint[] }) {
  return (
    <section className={`${CARD_CLASS} p-7 lg:col-span-2`}>
      <h2 className="text-lg font-semibold text-white">Curva de uso del CRM</h2>
      <p className="mt-1 text-sm text-white/50">Clientes nuevos registrados en el período</p>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.4)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "rgba(212,165,116,0.3)" }}
              contentStyle={{
                background: "#2c3e50",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                color: "#fff",
              }}
              formatter={(v: number) => [v, "Clientes nuevos"]}
            />
            <Line
              type="monotone"
              dataKey="customers"
              stroke="#d4a574"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 5, fill: "#d4a574", stroke: "#2c3e50", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

