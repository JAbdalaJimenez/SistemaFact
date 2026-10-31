import { notFound } from "next/navigation";
import Link from "next/link";
import { getJobById } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { formatCurrencyARS, formatPhoneForWhatsApp, formatDate } from "@/lib/types";
import { JobDetailsClient } from "./client";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  MapPin,
  Phone,
  FileText,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const [job, session] = await Promise.all([getJobById(id), getSession()]);

  if (!job || (session?.organizationId && job.organizationId !== session.organizationId && session.role !== "SUPERADMIN")) {
    notFound();
  }

  const totalPaid = job.totalAmount - job.balanceDue;
  const paidPercentage = Math.min(
    100,
    Math.round((totalPaid / job.totalAmount) * 100)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* NAVEGACIÓN SUPERIOR */}
      <div className="flex items-center justify-between">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Órdenes</span>
        </Link>

        <span className="text-xs font-bold text-slate-500">
          ID: <span className="font-mono">{job.id}</span>
        </span>
      </div>

      {/* CABECERA DE LA ORDEN DE TRABAJO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Orden de Trabajo Eléctrica
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {job.title}
          </h1>
        </div>

        {/* DETALLE DEL CLIENTE Y UBICACIÓN EN CÓRDOBA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Cliente</span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">{job.customer.name}</p>
            <p className="flex items-center gap-1 mt-1 text-slate-500">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{job.customer.address} • {job.customer.neighborhood}</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Contacto & Teléfono</span>
            <p className="flex items-center gap-1 mt-1 text-slate-700 font-semibold">
              <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>{job.customer.phone}</span>
            </p>
            {job.scheduledDate && (
              <p className="flex items-center gap-1 mt-1 text-slate-500">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Fecha pactada: {formatDate(job.scheduledDate)}</span>
              </p>
            )}
          </div>
        </div>

        {job.notes && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Notas técnicas: </span>
            {job.notes}
          </div>
        )}
      </div>

      {/* COMPONENTE INTERACTIVO DE GESTIÓN DE ESTADO, PAGOS Y MERCADO PAGO */}
      <JobDetailsClient
        job={job}
        initialStatus={job.status}
        initialBalanceDue={job.balanceDue}
        totalAmount={job.totalAmount}
        totalPaid={totalPaid}
        initialPayments={job.payments || []}
      />
    </div>
  );
}
