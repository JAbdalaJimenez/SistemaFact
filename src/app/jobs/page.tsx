import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Plus,
} from "lucide-react";
import { getJobs } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { formatCurrencyARS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JobsListPage() {
  const session = await getSession();
  const jobs = await getJobs(session?.organizationId);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
            Ejecución y Cronograma de Obras
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0B132B] tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#9A6E24]" strokeWidth={1.5} />
            <span>Órdenes de Trabajo y Cobranzas</span>
          </h1>
          <p className="text-xs text-[#475569] font-normal">
            Seguimiento de obras eléctricas, estados técnicos y control de saldos pendientes
          </p>
        </div>

        <Link
          href="/quotes/new"
          prefetch={true}
          className="bg-[#0B132B] hover:bg-[#1C2541] text-white border border-[#1C2541] font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
          <span>Nueva Obra / Presupuesto</span>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-[#9A6E24] flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-[#0B132B]">No hay órdenes de trabajo activas</h3>
          <p className="text-xs text-[#475569] max-w-sm mx-auto">
            Las órdenes de trabajo se generan automáticamente cuando un presupuesto es aprobado o se acredita una seña técnica.
          </p>
          <div className="pt-2">
            <Link
              href="/quotes/new"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-medium rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>Emitir Nuevo Presupuesto</span>
            </Link>
          </div>
        </div>
      ) : (
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
              prefetch={true}
              className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm hover:border-[#C5A059]/40 transition-all block group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[#0B132B] group-hover:text-[#9A6E24] transition-colors">
                      {job.title}
                    </h3>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider border ${
                        isCompleted
                          ? "bg-emerald-50 text-[#166534] border-emerald-200"
                          : isInProgress
                          ? "bg-slate-100 text-[#0B132B] border-slate-300"
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

                  <p className="text-xs text-[#475569] mt-1 flex items-center gap-1.5 font-normal">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                    <span>
                      {job.customer.name} • {job.customer.neighborhood} ({job.customer.address})
                    </span>
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-medium text-[#475569] uppercase tracking-wider">Total Pactado</span>
                  <p className="text-lg font-semibold text-[#0B132B] tabular-nums">
                    {formatCurrencyARS(job.totalAmount)}
                  </p>
                </div>
              </div>

              {/* BARRA DE PROGRESO DE COBRO */}
              <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between text-xs mb-1.5 font-normal">
                  <span className="text-[#475569]">
                    Cobrado: <strong className="text-[#166534] tabular-nums font-semibold">{formatCurrencyARS(totalPaid)}</strong> ({paidPercentage}%)
                  </span>
                  <span className={job.balanceDue > 0 ? "text-[#B45309] font-medium" : "text-[#166534] font-medium"}>
                    Saldo: <strong className="tabular-nums font-semibold">{formatCurrencyARS(job.balanceDue)}</strong>
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      paidPercentage === 100
                        ? "bg-[#166534]"
                        : paidPercentage >= 50
                        ? "bg-[#0B132B]"
                        : "bg-[#B45309]"
                    }`}
                    style={{ width: `${paidPercentage}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
        </div>
      )}
    </div>
  );
}
