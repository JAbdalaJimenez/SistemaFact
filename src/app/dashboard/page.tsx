import Link from "next/link";
import Image from "next/image";
import {
  DollarSign,
  FileText,
  Briefcase,
  Plus,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  MapPin,
  TrendingUp,
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
      {/* TARJETA DE PERFIL Y MATRÍCULA ERSEP - ARCHITECTURAL EXECUTIVE */}
      <div className="bg-[#0F172A] rounded-2xl p-6 text-white shadow-sm border border-[#1E293B] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A6E24] via-[#C5A059] to-[#9A6E24]" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="bg-[#1E293B] border border-[#C5A059]/40 text-[#C5A059] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="tabular-nums">ERSeP Cat. III • Mat. 14892</span>
              </span>
              <span className="text-[11px] text-slate-400">Córdoba Capital</span>
            </div>
            <div className="flex items-center gap-3.5 pt-1">
              <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-[#C5A059]/40 flex items-center justify-center p-1.5 shrink-0 shadow-inner">
                <Image
                  src="/logo-icon.png"
                  alt="ElectroCba"
                  width={42}
                  height={42}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {org.name}
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 font-normal">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> {org.address} • {org.taxCondition || "Monotributo"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t border-[#1E293B] sm:border-t-0">
            <Link
              href="/quotes/new"
              className="bg-[#C5A059] hover:bg-[#B08B42] text-[#0F172A] font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Emitir Presupuesto</span>
            </Link>
            <Link
              href="/customers/new"
              className="bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] font-medium text-xs sm:text-sm py-2.5 px-3 rounded-xl transition-all flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Cliente</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES (KPIS REALES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Dinero pendiente por cobrar */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:border-[#C5A059]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B45309] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Saldo Pendiente de Cobro
            </span>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
              ARS
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight tabular-nums">
              {formatCurrencyARS(metrics.balancePending)}
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Suma de saldos pendientes en órdenes activas
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#0F172A]">
            <Link href="/jobs" className="hover:underline flex items-center gap-1">
              Ver órdenes con saldo <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </Link>
          </div>
        </div>

        {/* KPI 2: Presupuestos a confirmar */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:border-[#0F172A]/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded border border-[#E2E8F0] flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#9A6E24]" /> Presupuestos en Curso
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center font-bold text-xs tabular-nums">
              {metrics.quotesPending}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight tabular-nums">
              {metrics.quotesPending} propuestas
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Enviadas o en borrador esperando conformidad
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#0F172A]">
            <Link href="/quotes" className="hover:underline flex items-center gap-1">
              Hacer seguimiento <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </Link>
          </div>
        </div>

        {/* KPI 3: Trabajos activos de la semana */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Trabajos en Ejecución
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#15803D] border border-emerald-200 flex items-center justify-center font-bold text-xs tabular-nums">
              {metrics.activeJobsWeek}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight tabular-nums">
              {metrics.activeJobsWeek} en obra
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Agendados y en ejecución en Córdoba
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold text-[#15803D]">
            <Link href="/jobs" className="hover:underline flex items-center gap-1">
              Ver cronograma <ArrowRight className="w-3.5 h-3.5 text-[#15803D]" />
            </Link>
          </div>
        </div>
      </div>

      {/* ACCIONES RÁPIDAS MOBILE */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm flex items-center justify-around sm:hidden">
        <Link
          href="/quotes/new"
          className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-[#F8FAFC]"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center mb-1 border border-[#1E293B]">
            <Plus className="w-5 h-5 text-[#C5A059]" />
          </div>
          <span className="text-xs font-semibold text-[#0F172A]">Presupuestar</span>
        </Link>
        <Link
          href="/customers/new"
          className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-[#F8FAFC]"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center mb-1">
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-[#0F172A]">Cliente</span>
        </Link>
        <Link
          href="/jobs"
          className="flex flex-col items-center text-center p-2 rounded-xl hover:bg-[#F8FAFC]"
        >
          <div className="w-10 h-10 rounded-xl bg-white text-[#0F172A] border border-[#E2E8F0] flex items-center justify-center mb-1">
            <Briefcase className="w-5 h-5 text-[#9A6E24]" />
          </div>
          <span className="text-xs font-semibold text-[#0F172A]">Órdenes</span>
        </Link>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
              Actividad Reciente y Expedientes
            </h2>
            <p className="text-xs text-[#64748B]">Últimos movimientos de presupuestos y certificados</p>
          </div>
          <Link
            href="/quotes"
            className="text-xs font-semibold text-[#0F172A] hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" />
          </Link>
        </div>

        <div className="divide-y divide-[#E2E8F0]/70">
          {metrics.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-[#64748B] text-sm">
              No hay actividad reciente registrada.
            </div>
          ) : (
            metrics.recentActivity.map((item) => {
              const isJob = item.type === "job";
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.link}
                  className="p-4 sm:px-5 hover:bg-[#F8FAFC] flex items-center justify-between gap-3 transition-colors block"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isJob
                          ? "bg-emerald-50 text-[#15803D] border-emerald-200"
                          : "bg-[#0F172A] text-white border-[#1E293B]"
                      }`}
                    >
                      {isJob ? (
                        <Briefcase className="w-5 h-5 text-[#15803D]" />
                      ) : (
                        <FileText className="w-5 h-5 text-[#C5A059]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#64748B] truncate">
                        Cliente: <span className="font-medium text-[#1E293B]">{item.customer}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#0F172A] tabular-nums">
                      {formatCurrencyARS(item.amount)}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 border ${
                        item.status === "APPROVED" || item.status === "COMPLETED"
                          ? "bg-emerald-50 text-[#15803D] border-emerald-200"
                          : item.status === "IN_PROGRESS"
                          ? "bg-slate-100 text-[#0F172A] border-slate-300"
                          : item.status === "SENT" || item.status === "SCHEDULED"
                          ? "bg-amber-50 text-[#B45309] border-amber-200"
                          : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
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
