import Link from "next/link";
import {
  FileText,
  Plus,
  ExternalLink,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { getQuotes } from "@/lib/services";
import { formatCurrencyARS, formatPhoneForWhatsApp } from "@/lib/types";

export const revalidate = 0;

export default async function QuotesListPage() {
  const quotes = await getQuotes();

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E24] block">
            Gestión Comercial y Técnica
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#9A6E24]" />
            <span>Presupuestos y Expedientes Emitidos</span>
          </h1>
          <p className="text-xs text-[#64748B]">
            Registro de propuestas formales, enlaces públicos con seña y seguimiento de estados
          </p>
        </div>

        <Link
          href="/quotes/new"
          className="bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#1E293B] font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#C5A059]" />
          <span>+ Emitir Presupuesto</span>
        </Link>
      </div>

      <div className="space-y-3">
        {quotes.map((q) => {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const publicUrl = `/p/${q.publicToken}`;
          const waPhone = formatPhoneForWhatsApp(q.customer.phone);
          const waMessage = `Hola ${q.customer.name}, te comparto el enlace de tu presupuesto formal (${q.title || "Trabajo eléctrico"}): ${baseUrl}${publicUrl}`;
          const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

          const isApproved = q.status === "APPROVED" || q.status === "CONVERTED";
          const isSent = q.status === "SENT";

          return (
            <div
              key={q.id}
              className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm hover:border-[#C5A059]/40 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-[#0F172A] truncate">
                    {q.title || "Presupuesto Eléctrico"}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                      isApproved
                        ? "bg-emerald-50 text-[#15803D] border-emerald-200"
                        : isSent
                        ? "bg-amber-50 text-[#B45309] border-amber-200"
                        : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]"
                    }`}
                  >
                    {q.status === "APPROVED"
                      ? "Aprobado"
                      : q.status === "CONVERTED"
                      ? "En Obra"
                      : q.status === "SENT"
                      ? "Enviado / Pendiente"
                      : "Borrador"}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-3 text-xs text-[#64748B] flex-wrap">
                  <span>
                    Cliente: <strong className="text-[#0F172A] font-semibold">{q.customer.name}</strong> ({q.customer.neighborhood})
                  </span>
                  <span>•</span>
                  <span className="tabular-nums">{q.items?.length || 0} partidas</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-400">Token: {q.publicToken.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t border-[#E2E8F0] sm:border-t-0">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Monto Total
                  </span>
                  <p className="text-lg font-bold text-[#0F172A] tabular-nums">
                    {formatCurrencyARS(q.totalAmount)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Compartir por WhatsApp"
                    className="p-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#15803D] hover:text-[#166534] transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>

                  <Link
                    href={publicUrl}
                    target="_blank"
                    className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all border border-[#1E293B]"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Ficha Técnica</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
