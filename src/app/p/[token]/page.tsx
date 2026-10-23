import { notFound } from "next/navigation";
import Image from "next/image";
import { getQuoteByPublicToken } from "@/lib/services";
import { formatCurrencyARS, formatDate } from "@/lib/types";
import { PublicQuoteClient } from "./client";
import {
  ShieldCheck,
  Zap,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Hammer,
  Package,
  Building2,
  FileCheck2,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const quote: any = await getQuoteByPublicToken(token);

  if (!quote) {
    notFound();
  }

  const depositPercent = quote.depositPercentage || 50;
  const depositAmount = Math.round((quote.totalAmount * depositPercent) / 100);
  const remainingAmount = quote.totalAmount - depositAmount;

  const quoteNum = quote.quoteNumber || `EC-${quote.id.slice(-6).toUpperCase()}`;

  // Discriminación de partidas: Mano de Obra vs Materiales
  const laborItems = (quote.items || []).filter((i: any) => i.itemType !== "MATERIALS");
  const materialItems = (quote.items || []).filter((i: any) => i.itemType === "MATERIALS");

  const laborSubtotal = laborItems.reduce((acc: number, curr: any) => acc + curr.subtotal, 0);
  const materialsSubtotal = materialItems.reduce((acc: number, curr: any) => acc + curr.subtotal, 0);

  // Helper para dividir título de tarea de especificación técnica
  const parseItemDetail = (text: string) => {
    if (text.includes(":")) {
      const parts = text.split(":");
      return {
        prefix: parts[0].trim(),
        title: parts.slice(1).join(":").trim(),
      };
    }
    return { prefix: "", title: text };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        {/* BARRA SUPERIOR DECORATIVA - ACENTO CHAMPAGNE GOLD */}
        <div className="h-1 bg-gradient-to-r from-[#9A6E24] via-[#C5A059] to-[#9A6E24]" />

        {/* MEMBRETE ASIMÉTRICO EJECUTIVO - DEEP OBSIDIAN & CHAMPAGNE GOLD */}
        <div className="bg-[#0F172A] p-6 sm:p-8 text-white border-b border-[#1E293B]">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* LADO IZQUIERDO: INSTALADOR MATRICULADO ERSEP */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-[#1E293B] border border-[#C5A059]/40 flex items-center justify-center p-1.5 shrink-0">
                  <Image
                    src="/logo-icon.png"
                    alt="ElectroCba"
                    width={44}
                    height={44}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {quote.organization?.name || "ElectroCba"}
                  </h1>
                  <p className="text-[11px] uppercase tracking-widest text-[#C5A059] font-semibold">
                    Ingeniería & Servicios Técnicos
                  </p>
                </div>
              </div>

              {/* SELLO LEGAL ERSEP CÓRDOBA */}
              <div className="inline-flex items-center gap-2 bg-[#1E293B] border border-[#C5A059]/50 text-[#C5A059] px-3 py-1.5 rounded-lg text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                <span className="tabular-nums">
                  {quote.organization?.ersepLicense || "Matrícula ERSeP Cat. III - N° 14892"}
                </span>
              </div>

              {/* METADATOS TÉCNICOS Y FISCALES */}
              <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                <p>
                  CUIT: <span className="text-slate-200 tabular-nums font-medium">{quote.organization?.cuit || "20-33445566-9"}</span> • Condición IVA:{" "}
                  <span className="text-slate-200 font-medium">{quote.organization?.taxCondition || "Monotributo"}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{quote.organization?.address || "Av. Colón 1450, B° Alberdi, Córdoba Capital"}</span>
                </p>
              </div>
            </div>

            {/* LADO DERECHO: NÚMERO DE PRESUPUESTO Y VALIDEZ (FICHA TÉCNICA) */}
            <div className="md:text-right space-y-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] block">
                Ficha Técnica Comercial
              </span>
              <p className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
                Presupuesto <span className="text-[#C5A059]">N° {quoteNum}</span>
              </p>

              <div className="text-xs text-slate-300 space-y-1">
                <p className="flex items-center md:justify-end gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Emisión:</span>
                  <strong className="text-white tabular-nums font-semibold">{formatDate(quote.createdAt)}</strong>
                </p>
                <p className="flex items-center md:justify-end gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Vigencia:</span>
                  <strong className="text-white tabular-nums font-semibold">{quote.validityDays || 15} días corridos</strong>
                </p>
                <div className="md:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#1E293B] text-slate-300 border border-slate-700 mt-1">
                  Ley de Seg. Eléctrica Pcia. Cba 10.281
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE DESTINATARIO & PROYECTO EJECUTIVO */}
        <div className="p-6 sm:p-8 border-b border-[#E2E8F0] bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block">
                Destinatario de la Propuesta
              </span>
              <h2 className="text-base sm:text-lg font-semibold text-[#0F172A]">
                {quote.customer?.name}
              </h2>
              <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {quote.customer?.address} ({quote.customer?.neighborhood}, Córdoba)
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {quote.customer?.phone}
                </span>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E24] block">
                Obra Dictaminada
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#0F172A]">
                {quote.title || "Adecuación Eléctrica Integral"}
              </p>
              <p className="text-[10px] text-[#64748B]">
                Revisión conforme a especificación AEA 90364
              </p>
            </div>
          </div>
        </div>

        {/* DESGLOSE CON TABLA DE PARTIDAS DE ESTILO ARQUITECTÓNICO */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* 1. PARTIDAS: MANO DE OBRA ESPECIALIZADA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#0F172A] flex items-center gap-2">
                <Hammer className="w-4 h-4 text-[#9A6E24]" />
                1. Mano de Obra Especializada y Protocolo Técnico
              </span>
              <span className="text-xs font-semibold tabular-nums text-[#0F172A]">
                Subtotal: {formatCurrencyARS(laborSubtotal)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="py-2.5 px-2">Partida / Tarea Calificada</th>
                    <th className="py-2.5 px-2 text-center w-16">Cant.</th>
                    <th className="py-2.5 px-2 text-right w-28">P. Unitario</th>
                    <th className="py-2.5 px-2 text-right w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]/70">
                  {laborItems.map((item: any, idx: number) => {
                    const parsed = parseItemDetail(item.description);
                    return (
                      <tr key={item.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-2">
                          <p className="font-semibold text-[#0F172A]">
                            {parsed.title}
                          </p>
                          {parsed.prefix && (
                            <p className="text-[11px] text-[#64748B] mt-0.5 font-normal">
                              Norma de aplicación: {parsed.prefix} • Reglamentación AEA 90364
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center tabular-nums text-[#1E293B] font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums text-[#64748B]">
                          {formatCurrencyARS(item.unitPrice)}
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums font-semibold text-[#0F172A]">
                          {formatCurrencyARS(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. PARTIDAS: PROVISIÓN DE MATERIALES NORMALIZADOS CON SELLO IRAM */}
          {materialItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#0F172A] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#15803D]" />
                  2. Provisión de Materiales y Componentes con Sello IRAM
                </span>
                <span className="text-xs font-semibold tabular-nums text-[#0F172A]">
                  Subtotal: {formatCurrencyARS(materialsSubtotal)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <th className="py-2.5 px-2">Componente / Especificación Técnica</th>
                      <th className="py-2.5 px-2 text-center w-16">Cant.</th>
                      <th className="py-2.5 px-2 text-right w-28">P. Unitario</th>
                      <th className="py-2.5 px-2 text-right w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/70">
                    {materialItems.map((item: any, idx: number) => {
                      const parsed = parseItemDetail(item.description);
                      return (
                        <tr key={item.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-2">
                            <p className="font-semibold text-[#0F172A]">
                              {parsed.title}
                            </p>
                            <p className="text-[11px] text-[#64748B] mt-0.5 font-normal">
                              Homologación: Sello de Conformidad IRAM / IEC • Material Ignífugo Normalizado
                            </p>
                          </td>
                          <td className="py-3 px-2 text-center tabular-nums text-[#1E293B] font-medium">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums text-[#64748B]">
                            {formatCurrencyARS(item.unitPrice)}
                          </td>
                          <td className="py-3 px-2 text-right tabular-nums font-semibold text-[#0F172A]">
                            {formatCurrencyARS(item.subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TOTALIZACIÓN Y CONDICIONES DE PAGO EJECUTIVAS */}
          <div className="pt-2 border-t border-[#E2E8F0] flex flex-col items-end">
            <div className="w-full sm:w-96 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                Liquidación de la Propuesta
              </span>

              <div className="flex justify-between text-xs text-[#64748B]">
                <span>Mano de Obra Especializada:</span>
                <span className="tabular-nums font-medium text-[#1E293B]">
                  {formatCurrencyARS(laborSubtotal)}
                </span>
              </div>

              {materialsSubtotal > 0 && (
                <div className="flex justify-between text-xs text-[#64748B]">
                  <span>Provisión Materiales IRAM:</span>
                  <span className="tabular-nums font-medium text-[#1E293B]">
                    {formatCurrencyARS(materialsSubtotal)}
                  </span>
                </div>
              )}

              {/* TOTAL DESTACADO EN CHAMPAGNE WARM GOLD Y DEEP OBSIDIAN */}
              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-baseline">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                  Importe Total:
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-[#9A6E24] tabular-nums">
                  {formatCurrencyARS(quote.totalAmount)}
                </span>
              </div>

              {/* CONDICIONES DE SEÑA 50% */}
              <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg space-y-1 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#15803D] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                    Seña Inicial ({depositPercent}%):
                  </span>
                  <span className="tabular-nums font-bold text-[#15803D] text-sm">
                    {formatCurrencyARS(depositAmount)}
                  </span>
                </div>
                <p className="text-[10px] text-[#64748B] leading-tight">
                  Requerida para reserva de fecha técnica en agenda y acopio de materiales.
                </p>
                <div className="flex justify-between text-[11px] text-[#64748B] pt-1 border-t border-slate-100">
                  <span>Saldo contra conformidad de obra:</span>
                  <span className="tabular-nums font-medium text-[#0F172A]">
                    {formatCurrencyARS(remainingAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BLOQUE DE CONDICIONES CONTRACTUALES Y LEGAL TECH (ERSEP CÓRDOBA Y LEY 24.240) */}
          <div className="bg-[#FAF8F5] border border-[#EADFC7] rounded-xl p-5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#EADFC7] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E24] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#9A6E24]" />
                Condiciones Contractuales y Marco Legal de Garantía
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Vigencia Legal Escrita
              </span>
            </div>

            <div className="text-[11px] text-[#334155] leading-relaxed whitespace-pre-line font-normal space-y-1">
              {quote.notes ||
                "1. MARCO NORMATIVO: Tareas ejecutadas bajo la Ley de Seguridad Eléctrica de Córdoba N° 10.281 y reglamentación AEA 90364.\n" +
                "2. GARANTÍA LEGAL ESCRITA: Ley Nacional de Defensa del Consumidor N° 24.240 (Arts. 11 y 21) con 6 meses de garantía sobre mano de obra y componentes.\n" +
                "3. CLÁUSULA ANTI-INFLACIÓN: Presupuesto fijo por el plazo de validez. Ajuste posterior aplicará exclusivamente si distribuidores varían más del 10%.\n" +
                "4. CONDICIONES DE PAGO: 50% de seña para reserva y acopio de materiales; saldo restante contra conformidad de obra.\n" +
                "5. MEDIOS HABILITADOS: Transferencia bancaria (Alias/CVU), Mercado Pago (Checkout Pro) y efectivo con recibo oficial."}
            </div>
          </div>

          {/* BARRA DE ACCIONES EJECUTIVAS: MERCADO PAGO, WHATSAPP Y EXPORTACIÓN */}
          <PublicQuoteClient
            quoteId={quote.id}
            publicToken={quote.publicToken}
            quoteNumber={quoteNum}
            title={quote.title || "Trabajo Eléctrico"}
            totalAmount={quote.totalAmount}
            depositAmount={depositAmount}
            depositPercentage={depositPercent}
            validityDays={quote.validityDays || 15}
            customerName={quote.customer?.name || "Cliente"}
            customerPhone={quote.customer?.phone || ""}
            electricianPhone="+5493515123456"
            status={quote.status}
          />
        </div>
      </div>
    </div>
  );
}
