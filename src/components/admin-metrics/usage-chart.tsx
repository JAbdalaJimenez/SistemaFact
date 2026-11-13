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
    <section className={`${CARD_CLASS} overflow-hidden lg:col-span-2`}>
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0]">
        <h2 className="text-base font-semibold text-[#0B132B]">Curva de uso del CRM</h2>
        <p className="mt-0.5 text-xs text-[#475569]">Clientes nuevos registrados en el período</p>
      </div>
      <div className="p-4 sm:p-5">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748B"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                stroke="#64748B"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: "#C5A059", strokeWidth: 1 }}
                contentStyle={{
                  background: "#0B132B",
                  border: "1px solid #1C2541",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 12,
                }}
                formatter={(v: number) => [v, "Clientes nuevos"]}
              />
              <Line
                type="monotone"
                dataKey="customers"
                stroke="#0B132B"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 5, fill: "#C5A059", stroke: "#0B132B", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
