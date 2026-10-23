import Link from "next/link";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MapPin,
  DollarSign,
} from "lucide-react";
import { getJobs } from "@/lib/services";
import { formatCurrencyARS } from "@/lib/types";

export const revalidate = 0;

export default async function JobsListPage() {
  const jobs = await getJobs();

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E24] block">
            Ejecución y Cronograma de Obras
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#9A6E24]" />
            <span>Órdenes de Trabajo y Cobranzas</span>
          </h1>
          <p className="text-xs text-[#64748B]">
            Seguimiento de obras eléctricas, estados técnicos y control de saldos pendientes
          </p>
        </div>

        <Link
          href="/quotes/new"
          className="bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#1E293B] font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <span>+ Nuevo Presupuesto / Obra</span>
        </Link>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => {
          const totalPaid = job.totalAmount - job.balanceDue;
          const paidPercentage = Math.min(
            100,
            Math.round((totalPaid / job.totalAmount) * 100)
          );

          const isCompleted = job.status === "COMPLETED";
          const isInProgress = job.status === "IN_PROGRESS";
          const isScheduled = job.status === "SCHEDULED";

          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm hover:border-[#C5A059]/40 transition-all block group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[#0F172A] group-hover:text-[#9A6E24] transition-colors">
                      {job.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        isCompleted
                          ? "bg-emerald-50 text-[#15803D] border-emerald-200"
                          : isInProgress
                          ? "bg-slate-100 text-[#0F172A] border-slate-300"
                          : "bg-amber-50 text-[#B45309] border-amber-200"
                      }`}
                    >
                      {isCompleted
                        ? "Finalizado"
                        : isInProgress
                        ? "En Curso"
                        : isScheduled
                        ? "Agendado"
                        : "Cancelado"}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {job.customer.name} • {job.customer.neighborhood} ({job.customer.address})
                    </span>
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pactado</span>
                  <p className="text-lg font-bold text-[#0F172A] tabular-nums">
                    {formatCurrencyARS(job.totalAmount)}
                  </p>
                </div>
              </div>

              {/* BARRA DE PROGRESO DE COBRO */}
              <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="text-[#64748B]">
                    Cobrado: <strong className="text-[#15803D] tabular-nums">{formatCurrencyARS(totalPaid)}</strong> ({paidPercentage}%)
                  </span>
                  <span className={job.balanceDue > 0 ? "text-[#B45309]" : "text-[#15803D]"}>
                    Saldo: <strong className="tabular-nums">{formatCurrencyARS(job.balanceDue)}</strong>
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      paidPercentage === 100
                        ? "bg-[#15803D]"
                        : paidPercentage >= 50
                        ? "bg-[#0F172A]"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${paidPercentage}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
