import Link from "next/link";
import {
  FileText,
  Plus,
  MessageCircle,
  Eye,
} from "lucide-react";
import { getQuotes, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { formatCurrencyARS, formatPhoneForWhatsApp } from "@/lib/types";
import { ConvertQuoteButton } from "@/components/convert-quote-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuotesListPage() {
  const session = await getSession();
  const orgId = session?.organizationId;
  const [quotes, org] = await Promise.all([
    getQuotes(orgId),
    getOrganization(orgId),
  ]);

  const orgName = org.name || "ElectroCba";
  const orgSigner = (org as any).legalName || orgName;
  const orgLicense = (org as any).ersepLicenseNumber || org.ersepLicense || "Instalador Habilitado ERSeP";

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
            Gestión Comercial y Técnica
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0B132B] tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#9A6E24]" strokeWidth={1.5} />
            <span>Presupuestos y Expedientes Emitidos</span>
          </h1>
          <p className="text-xs text-[#475569] font-normal">
            Registro de propuestas formales, enlaces públicos con seña y seguimiento de estados
          </p>
        </div>

        <Link
          href="/quotes/new"
          prefetch={true}
          className="bg-[#0B132B] hover:bg-[#1C2541] text-white border border-[#1C2541] font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
          <span>Emitir Presupuesto</span>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-[#9A6E24] flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-[#0B132B]">No hay presupuestos emitidos aún</h3>
          <p className="text-xs text-[#475569] max-w-sm mx-auto">
            Cree su primer presupuesto formal con discriminación de mano de obra, insumos normalizados IRAM y seña del 50%.
          </p>
          <div className="pt-2">
            <Link
              href="/quotes/new"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-medium rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>Emitir Primer Presupuesto</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const safeToken = q.publicToken || q.id || "";
            const publicUrl = safeToken ? `/p/${safeToken}` : "#";
            const customerName = q.customer?.name || "Comitente General";
            const customerPhone = q.customer?.phone || "";
            const customerNeighborhood = q.customer?.neighborhood ? ` (${q.customer.neighborhood})` : "";
            const waPhone = customerPhone ? formatPhoneForWhatsApp(customerPhone) : "";
            const waMessage = `Estimado/a ${customerName}:\n\nLe remitimos el enlace oficial correspondiente a su presupuesto formal (${q.title || "Servicios Técnicos Especializados"}):\n${baseUrl}${publicUrl}\n\nAtentamente,\n${orgSigner} (${orgLicense}).`;
            const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}` : `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

            const isApproved = q.status === "APPROVED" || q.status === "CONVERTED";
            const isSent = q.status === "SENT";
            const tokenPreview = safeToken ? (safeToken.length >= 8 ? safeToken.slice(0, 8) : safeToken) : "S/D";

            return (
              <div
                key={q.id || Math.random()}
                className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm hover:border-[#C5A059]/40 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[#0B132B] truncate">
                      {q.title || "Presupuesto Eléctrico"}
                    </h3>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider border ${
                        isApproved
                          ? "bg-emerald-50 text-[#166534] border-emerald-200"
                          : isSent
                          ? "bg-amber-50 text-[#B45309] border-amber-200"
                          : "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]"
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

                  <div className="mt-1 flex items-center gap-3 text-xs text-[#475569] flex-wrap font-normal">
                    <span>
                      Comitente: <strong className="text-[#0B132B] font-medium">{customerName}</strong>{customerNeighborhood}
                    </span>
                    <span>•</span>
                    <span className="tabular-nums">{q.items?.length || 0} partidas</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-400">Token: {tokenPreview}...</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t border-[#E2E8F0] sm:border-t-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-medium text-[#475569] uppercase tracking-wider">
                      Monto Total
                    </span>
                    <p className="text-lg font-semibold text-[#0B132B] tabular-nums">
                      {formatCurrencyARS(q.totalAmount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <ConvertQuoteButton
                      quoteId={q.id}
                      isConverted={isApproved}
                      existingJobId={(q as any).job?.id || null}
                    />

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Compartir por WhatsApp"
                      className="p-2.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#166534] hover:text-[#14532D] transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                    </a>

                    <Link
                      href={publicUrl}
                      prefetch={true}
                      target="_blank"
                      className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all border border-[#1C2541]"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                      <span>Ficha Técnica</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
