import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Plus,
  FileText,
} from "lucide-react";
import { getJobs, getQuotes } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { formatCurrencyARS } from "@/lib/types";
import { ConvertQuoteButton } from "@/components/convert-quote-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JobsListPage() {
  const session = await getSession();
  const [jobs, quotes] = await Promise.all([
    getJobs(session?.organizationId),
    getQuotes(session?.organizationId),
  ]);

  const pendingQuotes = (quotes || []).filter(
    (q: any) => !q.job && q.status !== "CONVERTED" && q.status !== "REJECTED"
  );

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
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-10 text-center border border-[#E2E8F0] shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-[#9A6E24] flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-[#0B132B]">No hay órdenes de trabajo en curso</h3>
            <p className="text-xs text-[#475569] max-w-md mx-auto">
              Inicie una orden de trabajo a partir de cualquiera de sus presupuestos emitidos o cree un nuevo presupuesto técnico.
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

          {pendingQuotes.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A6E24]">
                  Conversión Directa a Obra
                </span>
                <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-1.5 mt-0.5">
                  <FileText className="w-4 h-4 text-[#9A6E24]" />
                  <span>Presupuestos Listos para Iniciar Obra ({pendingQuotes.length})</span>
                </h2>
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {pendingQuotes.map((q: any) => (
                  <div
                    key={q.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0B132B]">
                        {q.title || "Presupuesto Eléctrico"}
                      </p>
                      <p className="text-xs text-[#475569]">
                        Cliente: <strong className="text-[#0B132B]">{q.customer?.name || "Comitente"}</strong> • Total: <strong className="tabular-nums text-[#0B132B]">{formatCurrencyARS(q.totalAmount)}</strong>
                      </p>
                    </div>
                    <div className="shrink-0">
                      <ConvertQuoteButton quoteId={q.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
        <div className="space-y-3">
        {jobs.map((job) => {
          const totalAmount = Number(job.totalAmount) || 0;
          const balanceDue = Number(job.balanceDue) || 0;
          const totalPaid = Math.max(0, totalAmount - balanceDue);
          const paidPercentage =
            totalAmount > 0
              ? Math.min(100, Math.round((totalPaid / totalAmount) * 100))
              : 100;

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
                      {job.title || "Orden de Trabajo Eléctrica"}
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
                      {job.customer?.name || "Comitente"} • {job.customer?.neighborhood || "Córdoba"} ({job.customer?.address || "Domicilio en obra"})
                    </span>
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-[10px] font-medium text-[#475569] uppercase tracking-wider">Total Pactado</span>
                  <p className="text-lg font-semibold text-[#0B132B] tabular-nums">
                    {formatCurrencyARS(totalAmount)}
                  </p>
                </div>
              </div>

              {/* BARRA DE PROGRESO DE COBRO */}
              <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between text-xs mb-1.5 font-normal">
                  <span className="text-[#475569]">
                    Cobrado: <strong className="text-[#166534] tabular-nums font-semibold">{formatCurrencyARS(totalPaid)}</strong> ({paidPercentage}%)
                  </span>
                  <span className={balanceDue > 0 ? "text-[#B45309] font-medium" : "text-[#166534] font-medium"}>
                    Saldo: <strong className="tabular-nums font-semibold">{formatCurrencyARS(balanceDue)}</strong>
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

        {pendingQuotes.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A6E24]">
                Presupuestos Pendientes de Inicio
              </span>
              <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-1.5 mt-0.5">
                <FileText className="w-4 h-4 text-[#9A6E24]" />
                <span>Otros Presupuestos Listos para Pasar a Obra ({pendingQuotes.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {pendingQuotes.map((q: any) => (
                <div
                  key={q.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0B132B]">
                      {q.title || "Presupuesto Eléctrico"}
                    </p>
                    <p className="text-xs text-[#475569]">
                      Cliente: <strong className="text-[#0B132B]">{q.customer?.name || "Comitente"}</strong> • Total: <strong className="tabular-nums text-[#0B132B]">{formatCurrencyARS(q.totalAmount)}</strong>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <ConvertQuoteButton quoteId={q.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
