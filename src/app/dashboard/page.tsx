import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  Briefcase,
  Plus,
  ArrowRight,
  Clock,
  ShieldCheck,
  UserPlus,
  MapPin,
} from "lucide-react";
import { getDashboardMetrics, getOrganization } from "@/lib/services";
import { formatCurrencyARS } from "@/lib/types";

export const revalidate = 0; // Datos frescos en cada solicitud

export default async function DashboardPage() {
  const [metrics, org] = await Promise.all([
    getDashboardMetrics(),
    getOrganization(),
  ]);

  return (
    <div className="space-y-6 font-sans">
      {/* PANEL DE HABILITACIÓN INSTITUCIONAL - CORPORATE AUTHORITY */}
      <div className="bg-[#0B132B] rounded-2xl p-6 text-white shadow-sm border border-[#1C2541] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A6E24] via-[#C5A059] to-[#9A6E24]" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="bg-[#1C2541] border border-[#C5A059]/40 text-[#C5A059] text-[10px] font-semibold px-2.5 py-0.5 rounded tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                <span className="tabular-nums">ERSeP Cat. III • Matrícula 14892</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Jurisdicción Córdoba Capital</span>
            </div>

            <div className="flex items-center gap-3.5 pt-1">
              <div className="w-12 h-12 rounded-xl bg-[#1C2541] border border-[#C5A059]/40 flex items-center justify-center p-1.5 shrink-0 shadow-inner">
                <Image
                  src="/logo-icon.png"
                  alt="ElectroCba"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  {org.name}
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 font-normal mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                  <span>{org.address}</span>
                  <span className="text-slate-500">•</span>
                  <span>{org.taxCondition || "Monotributo - Servicios Técnicos"}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t border-[#1C2541] sm:border-t-0">
            <Link
              href="/quotes/new"
              prefetch={true}
              className="bg-[#C5A059] hover:bg-[#B08B42] text-[#0B132B] font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              <span>Nuevo Presupuesto</span>
            </Link>
            <Link
              href="/customers/new"
              prefetch={true}
              className="bg-[#1C2541] hover:bg-[#2A3B5C] text-white border border-[#2A3B5C] font-medium text-xs sm:text-sm py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Nuevo Cliente</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MÉTRICAS DE CONTROL OPERATIVO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Saldo Pendiente */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#B45309] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Cobranzas Pendientes</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#475569]">
                ARS
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-semibold text-[#0B132B] tracking-tight tabular-nums">
                {formatCurrencyARS(metrics.balancePending)}
              </h3>
              <p className="text-xs text-[#475569] mt-1 font-normal">
                Saldos contractuales pendientes de liquidación
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-medium text-[#0B132B]">
            <Link href="/jobs" prefetch={true} className="hover:underline flex items-center gap-1 text-[#0B132B]">
              <span>Auditar órdenes con saldo</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* KPI 2: Presupuestos en Curso */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#0B132B] bg-slate-100 px-2 py-0.5 rounded border border-[#E2E8F0] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#9A6E24]" strokeWidth={1.5} />
                <span>Expedientes en Evaluación</span>
              </span>
              <div className="w-6 h-6 rounded-md bg-[#F8FAFC] text-[#0B132B] border border-[#E2E8F0] flex items-center justify-center font-semibold text-xs tabular-nums">
                {metrics.quotesPending}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-semibold text-[#0B132B] tracking-tight tabular-nums">
                {metrics.quotesPending} propuestas
              </h3>
              <p className="text-xs text-[#475569] mt-1 font-normal">
                Emitidas y en espera de conformidad del comitente
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-medium text-[#0B132B]">
            <Link href="/quotes" prefetch={true} className="hover:underline flex items-center gap-1 text-[#0B132B]">
              <span>Ver cartera de presupuestos</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* KPI 3: Obras en Ejecución */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#166534] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Obras en Ejecución</span>
              </span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-[#166534] border border-emerald-200 flex items-center justify-center font-semibold text-xs tabular-nums">
                {metrics.activeJobsWeek}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl sm:text-3xl font-semibold text-[#0B132B] tracking-tight tabular-nums">
                {metrics.activeJobsWeek} activas
              </h3>
              <p className="text-xs text-[#475569] mt-1 font-normal">
                Cronograma técnico en curso bajo Norma AEA
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-medium text-[#166534]">
            <Link href="/jobs" prefetch={true} className="hover:underline flex items-center gap-1">
              <span>Inspeccionar cronograma</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#166534]" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>

      {/* ACCIONES RÁPIDAS MOBILE */}
      <div className="bg-white rounded-2xl p-3 border border-[#E2E8F0] shadow-sm flex items-center justify-around sm:hidden">
        <Link
          href="/quotes/new"
          prefetch={true}
          className="flex flex-col items-center text-center p-2 rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0B132B] text-white flex items-center justify-center mb-1">
            <Plus className="w-5 h-5 text-[#C5A059]" strokeWidth={1.5} />
          </div>
          <span className="text-xs font-medium text-[#0B132B]">Presupuestar</span>
        </Link>
        <Link
          href="/customers/new"
          prefetch={true}
          className="flex flex-col items-center text-center p-2 rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-[#0B132B] border border-[#E2E8F0] flex items-center justify-center mb-1">
            <UserPlus className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <span className="text-xs font-medium text-[#0B132B]">Cliente</span>
        </Link>
        <Link
          href="/jobs"
          prefetch={true}
          className="flex flex-col items-center text-center p-2 rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-[#0B132B] border border-[#E2E8F0] flex items-center justify-center mb-1">
            <Briefcase className="w-5 h-5 text-[#9A6E24]" strokeWidth={1.5} />
          </div>
          <span className="text-xs font-medium text-[#0B132B]">Órdenes</span>
        </Link>
      </div>

      {/* EXPEDIENTES Y ACTIVIDAD RECIENTE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0B132B]">
              Registro de Expedientes y Actividad
            </h2>
            <p className="text-xs text-[#475569] font-normal">
              Historial de movimientos formales, certificaciones y actas técnicas
            </p>
          </div>
          <Link
            href="/quotes"
            prefetch={true}
            className="text-xs font-medium text-[#0B132B] hover:underline flex items-center gap-1"
          >
            <span>Ver listado completo</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {metrics.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-[#475569] text-sm">
              No hay actividad reciente registrada en el libro de actas.
            </div>
          ) : (
            metrics.recentActivity.map((item) => {
              const isJob = item.type === "job";
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.link}
                  prefetch={true}
                  className="p-4 sm:px-5 hover:bg-[#F8FAFC] flex items-center justify-between gap-3 transition-colors block"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isJob
                          ? "bg-emerald-50 text-[#166534] border-emerald-200"
                          : "bg-[#0B132B] text-white border-[#1C2541]"
                      }`}
                    >
                      {isJob ? (
                        <Briefcase className="w-4 h-4 text-[#166534]" strokeWidth={1.5} />
                      ) : (
                        <FileText className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0B132B] truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#475569] truncate font-normal">
                        Comitente: <span className="text-[#0B132B] font-medium">{item.customer}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-[#0B132B] tabular-nums">
                      {formatCurrencyARS(item.amount)}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded uppercase mt-0.5 border ${
                        item.status === "APPROVED" || item.status === "COMPLETED"
                          ? "bg-emerald-50 text-[#166534] border-emerald-200"
                          : item.status === "IN_PROGRESS"
                          ? "bg-slate-100 text-[#0B132B] border-slate-300"
                          : item.status === "SENT" || item.status === "SCHEDULED"
                          ? "bg-amber-50 text-[#B45309] border-amber-200"
                          : "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]"
                      }`}
                    >
                      {item.status === "APPROVED"
                        ? "Aprobado"
                        : item.status === "COMPLETED"
                        ? "Finalizado"
                        : item.status === "IN_PROGRESS"
                        ? "En Curso"
                        : item.status === "SENT"
                        ? "Enviado"
                        : item.status === "SCHEDULED"
                        ? "Agendado"
                        : "Borrador"}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
