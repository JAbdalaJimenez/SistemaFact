"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  CreditCard,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Loader2,
  Download,
  FileCode,
  Share2,
} from "lucide-react";
import { formatCurrencyARS, formatPhoneForWhatsApp } from "@/lib/types";

interface Props {
  quoteId: string;
  publicToken: string;
  quoteNumber: string;
  title: string;
  totalAmount: number;
  depositAmount: number;
  depositPercentage: number;
  validityDays: number;
  customerName: string;
  customerPhone: string;
  electricianPhone: string;
  status: string;
}

export function PublicQuoteClient({
  quoteId,
  publicToken,
  quoteNumber,
  title,
  totalAmount,
  depositAmount,
  depositPercentage,
  validityDays,
  customerName,
  customerPhone,
  electricianPhone,
  status: initialStatus,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loadingMp, setLoadingMp] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const isApproved = status === "APPROVED" || status === "CONVERTED";

  const baseUrl = origin || "http://localhost:3000";
  const publicUrl = `${baseUrl}/p/${publicToken}`;
  const pdfDownloadUrl = `${baseUrl}/api/quotes/${quoteId}/export/pdf`;
  const docxDownloadUrl = `${baseUrl}/api/quotes/${quoteId}/export/docx`;

  // 1. Enlace para aprobar vía WhatsApp directo al instalador habilitado
  const cleanElectricianPhone = formatPhoneForWhatsApp(electricianPhone);
  const approvalMessage = `Estimado Marcos Romero (ElectroCba):\n\nConfirmo la aprobación formal del Presupuesto N° ${quoteNumber} (*${title}*) por el monto total de *${formatCurrencyARS(
    totalAmount
  )}* (Seña formal: ${formatCurrencyARS(depositAmount)}).\n\nAcepto los términos normativos de la Ley 10.281 y Ley 24.240. Solicito coordinar la fecha de inicio de obra.`;

  const waApprovalUrl = `https://wa.me/${cleanElectricianPhone}?text=${encodeURIComponent(
    approvalMessage
  )}`;

  // 2. Enlace predefinido para compartir presupuesto y PDF por WhatsApp
  const cleanCustomerPhone = customerPhone ? formatPhoneForWhatsApp(customerPhone) : "";
  const shareMessage = `Estimado/a ${customerName}:\n\nLe remito el Presupuesto Formal N° ${quoteNumber} emitido por ElectroCba para ${title}.\n\nMonto Total: ${formatCurrencyARS(
    totalAmount
  )} (Vigencia: ${validityDays} días corridos).\n\nPuede revisar la ficha técnica reglamentaria y confirmar el anticipo en el siguiente enlace oficial:\n${publicUrl}\n\nDescarga del instrumento en PDF formal:\n${pdfDownloadUrl}`;

  const waShareUrl = cleanCustomerPhone
    ? `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(shareMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  // 3. Botón para abonar seña vía Mercado Pago
  const handlePayDepositMercadoPago = async () => {
    setLoadingMp(true);
    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          amount: depositAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar la preferencia");
      }

      window.location.href = data.initPoint || data.shortUrl;
    } catch (err: unknown) {
      alert("Error al conectar con Mercado Pago: " + String(err));
      setLoadingMp(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pt-6 border-t border-[#E2E8F0] space-y-6">
      {/* ESTADO DE APROBACIÓN */}
      {isApproved ? (
        <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-5 text-center space-y-2">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-emerald-950">
            Propuesta Aprobada y Asignada a Agenda Técnica
          </h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            El instalador habilitado ya tiene agendado este trabajo. Nos pondremos en contacto para coordinar el ingreso al inmueble.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#FAF8F5] border border-[#EADFC7] rounded-xl p-3.5 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#9A6E24] shrink-0" />
            <p className="text-xs text-[#0F172A] font-medium leading-relaxed">
              Podés formalizar la aceptación de este presupuesto directamente por WhatsApp o abonar la seña técnica online ({depositPercentage}%) para reservar la fecha en agenda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* BOTÓN 1: APROBAR VÍA WHATSAPP */}
            <a
              href={waApprovalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-xs sm:text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Aprobar Presupuesto por WhatsApp</span>
            </a>

            {/* BOTÓN 2: ABONAR SEÑA CON MERCADO PAGO */}
            <button
              onClick={handlePayDepositMercadoPago}
              disabled={loadingMp}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs sm:text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm border border-[#1E293B] transition-all cursor-pointer disabled:opacity-70 active:scale-[0.98]"
            >
              {loadingMp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                  <span>Conectando pasarela...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-[#C5A059]" />
                  <span>
                    Abonar Seña ({formatCurrencyARS(depositAmount)}) con Mercado Pago
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENTACIÓN OFICIAL Y EXPORTACIÓN */}
      <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
          Documentación Oficial y Exportación Legal
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <a
            href={pdfDownloadUrl}
            target="_blank"
            download
            className="p-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all border border-[#1E293B]"
          >
            <Download className="w-4 h-4 text-[#C5A059]" />
            <span>Descargar PDF Formal</span>
          </a>

          <a
            href={docxDownloadUrl}
            target="_blank"
            download
            className="p-3 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <FileCode className="w-4 h-4 text-[#9A6E24]" />
            <span>Descargar Word (.docx)</span>
          </a>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-white hover:bg-[#F8FAFC] text-[#15803D] border border-[#E2E8F0] font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Reenviar por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* PIE DE ACCIONES SECUNDARIAS */}
      <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir Ficha Técnica</span>
        </button>

        <span>ElectroCba • Sistema de Presupuestos Digitales Habilitados ERSeP</span>
      </div>
    </div>
  );
}
