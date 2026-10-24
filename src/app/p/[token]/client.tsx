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
  Copy,
  Check,
  Building,
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
  isPaid?: boolean;
  organizationName?: string;
  electricianLegalName?: string;
  ersepLicense?: string;
  bankAlias?: string;
  cbuCvu?: string;
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
  isPaid = false,
  organizationName = "ElectroCba",
  electricianLegalName = "Instalador Electricista",
  ersepLicense = "Matrícula Habilitada ERSeP",
  bankAlias,
  cbuCvu,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loadingMp, setLoadingMp] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const isApproved = isPaid || status === "APPROVED" || status === "CONVERTED";
  const remainingAmount = totalAmount - depositAmount;

  const baseUrl = origin || "http://localhost:3000";
  const publicUrl = `${baseUrl}/p/${publicToken}`;
  const pdfDownloadUrl = `${baseUrl}/api/quotes/${quoteId}/export/pdf`;
  const docxDownloadUrl = `${baseUrl}/api/quotes/${quoteId}/export/docx`;

  // 1. Enlace para aprobar vía WhatsApp directo al instalador habilitado
  const cleanElectricianPhone = formatPhoneForWhatsApp(electricianPhone);
  const approvalMessage = `Estimado/a ${electricianLegalName} (${organizationName}):\n\nConfirmo la aprobación formal del Presupuesto N° ${quoteNumber} (*${title}*) por el monto total de *${formatCurrencyARS(
    totalAmount
  )}* (Seña formal requerida: ${formatCurrencyARS(depositAmount)}).\n\nAcepto los términos técnicos y normativos (Ley 10.281 y Ley 24.240). Solicito coordinar la fecha de inicio de obra.`;

  const waApprovalUrl = `https://wa.me/${cleanElectricianPhone}?text=${encodeURIComponent(
    approvalMessage
  )}`;

  // 2. Enlace predefinido para compartir presupuesto y PDF por WhatsApp
  const cleanCustomerPhone = customerPhone ? formatPhoneForWhatsApp(customerPhone) : "";
  const shareMessage = `Estimado/a ${customerName}:\n\nLe remito el Presupuesto Formal N° ${quoteNumber} emitido por ${organizationName} (${ersepLicense}) correspondiente a: ${title}.\n\nMonto Total: ${formatCurrencyARS(
    totalAmount
  )} (Vigencia legal: ${validityDays} días corridos).\n\nPuede revisar la ficha técnica reglamentaria y confirmar el anticipo en el siguiente enlace oficial:\n${publicUrl}\n\nDescarga del instrumento en PDF formal:\n${pdfDownloadUrl}\n\nAtentamente,\n${electricianLegalName}.`;

  const waShareUrl = cleanCustomerPhone
    ? `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(shareMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  // 3. Botón para abonar seña vía Mercado Pago Checkout Pro
  const handlePayDepositMercadoPago = async () => {
    if (isApproved) return;
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

      const redirectUrl = data.initPoint || data.shortUrl;
      if (!redirectUrl) {
        throw new Error("No se recibió la URL de redirección de Mercado Pago");
      }

      window.location.href = redirectUrl;
    } catch (err: unknown) {
      alert("Error al conectar con la pasarela de pago: " + String(err));
      setLoadingMp(false);
    }
  };

  const handleCopy = (text: string, type: "alias" | "cbu") => {
    navigator.clipboard.writeText(text);
    if (type === "alias") {
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    } else {
      setCopiedCbu(true);
      setTimeout(() => setCopiedCbu(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pt-6 border-t border-[#E2E8F0] space-y-6">
      {/* ESTADO FORMAL DE APROBACIÓN O COMPROBANTE DE SEÑA ACREDITADA */}
      {isApproved ? (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#166534] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/60 text-[#166534] px-2 py-0.5 rounded">
                  Comprobante Formal • Seña Acreditada
                </span>
                <h3 className="text-base sm:text-lg font-bold text-emerald-950 mt-0.5">
                  Reserva y Acopio de Materiales Confirmados
                </h3>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-semibold text-emerald-800 block">
                Operación Imputable
              </span>
              <span className="font-mono text-xs font-bold text-emerald-950">
                Presupuesto N° {quoteNumber}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-medium text-emerald-800 uppercase block">
                Seña Acreditada ({depositPercentage}%)
              </span>
              <span className="text-sm font-bold text-[#166534] tabular-nums mt-0.5 block">
                {formatCurrencyARS(depositAmount)}
              </span>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-medium text-emerald-800 uppercase block">
                Saldo Final a Liquidar
              </span>
              <span className="text-sm font-semibold text-emerald-950 tabular-nums mt-0.5 block">
                {formatCurrencyARS(remainingAmount)}
              </span>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-medium text-emerald-800 uppercase block">
                Profesional Habilitado
              </span>
              <span className="text-xs font-medium text-emerald-950 truncate mt-0.5 block">
                {electricianLegalName}
              </span>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-medium text-emerald-800 uppercase block">
                Habilitación Oficial
              </span>
              <span className="text-xs font-medium text-emerald-950 truncate mt-0.5 block">
                {ersepLicense}
              </span>
            </div>
          </div>

          <p className="text-xs text-emerald-900 leading-relaxed">
            La seña inicial ha sido formalmente acreditada. El trabajo técnico se encuentra agendado conforme a la Ley de Seguridad Eléctrica N° 10.281. El saldo restante ({formatCurrencyARS(remainingAmount)}) se cancelará una vez finalizadas las tareas y emitido el protocolo de conformidad técnica.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              disabled
              className="w-full sm:w-auto bg-emerald-100 text-[#166534] border border-emerald-300 font-medium text-xs py-3 px-5 rounded-xl flex items-center justify-center gap-2 opacity-90 cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 text-[#166534]" />
              <span>Seña Ya Acreditada • Pago Concluido</span>
            </button>

            <a
              href={waApprovalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#166534] hover:bg-[#14532D] text-white font-medium text-xs py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Coordinar Acceso al Inmueble</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#FAF8F5] border border-[#EADFC7] rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#9A6E24] shrink-0 mt-0.5" />
            <div className="text-xs text-[#0F172A] space-y-1">
              <p className="font-semibold text-[#0B132B]">
                Aceptación Formal y Reserva de Turno Técnico
              </p>
              <p className="text-[#475569] leading-relaxed">
                Podés confirmar este presupuesto formalizando el anticipo del {depositPercentage}% ({formatCurrencyARS(depositAmount)}) mediante Mercado Pago (Checkout Pro Oficial) o coordinar la visita técnica directamente por WhatsApp con el instalador matriculado.
              </p>
            </div>
          </div>

          {/* BOTONES PRINCIPALES GRANDES - RESPONSIVE MOBILE FIRST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* BOTÓN 1: ABONAR SEÑA CON MERCADO PAGO */}
            <button
              onClick={handlePayDepositMercadoPago}
              disabled={loadingMp}
              className="min-h-[48px] bg-[#009EE3] hover:bg-[#0089C7] text-white font-semibold text-xs sm:text-sm py-3.5 px-5 rounded-xl flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-70 active:scale-[0.98]"
            >
              {loadingMp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Conectando a Mercado Pago...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>
                    Abonar Seña ({formatCurrencyARS(depositAmount)}) con Mercado Pago
                  </span>
                </>
              )}
            </button>

            {/* BOTÓN 2: APROBAR VÍA WHATSAPP */}
            <a
              href={waApprovalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-xs sm:text-sm py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Aprobar Presupuesto por WhatsApp</span>
            </a>
          </div>

          {/* OPCIÓN DIRECTA DE TRANSFERENCIA BANCARIA */}
          {(bankAlias || cbuCvu) && (
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#0B132B]">
                <Building className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
                <span>Medio Alternativo: Transferencia Bancaria Inmediata</span>
              </div>
              <p className="text-[11px] text-[#475569]">
                Puede transferir la seña de {formatCurrencyARS(depositAmount)} a la cuenta habilitada del profesional:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {bankAlias && (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                    <div>
                      <span className="text-[10px] uppercase text-[#475569] font-medium block">Alias CBU/CVU</span>
                      <strong className="text-xs font-mono text-[#0B132B]">{bankAlias}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(bankAlias, "alias")}
                      className="p-1.5 text-[#475569] hover:text-[#0B132B] hover:bg-slate-100 rounded cursor-pointer"
                      title="Copiar Alias"
                    >
                      {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                {cbuCvu && (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                    <div>
                      <span className="text-[10px] uppercase text-[#475569] font-medium block">CBU / CVU</span>
                      <strong className="text-xs font-mono text-[#0B132B]">{cbuCvu}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(cbuCvu, "cbu")}
                      className="p-1.5 text-[#475569] hover:text-[#0B132B] hover:bg-slate-100 rounded cursor-pointer"
                      title="Copiar CBU"
                    >
                      {copiedCbu ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all border border-[#1C2541]"
          >
            <Download className="w-4 h-4 text-[#C5A059]" />
            <span>Descargar PDF Formal</span>
          </a>

          <a
            href={docxDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 bg-white hover:bg-[#F8FAFC] text-[#0B132B] border border-[#E2E8F0] font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <FileCode className="w-4 h-4 text-[#9A6E24]" />
            <span>Descargar Word (.docx)</span>
          </a>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 bg-white hover:bg-[#F8FAFC] text-[#166534] border border-[#E2E8F0] font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Reenviar por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* PIE DE ACCIONES SECUNDARIAS */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64748B] pt-2 gap-2">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 hover:text-[#0B132B] transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir Ficha Técnica Oficial</span>
        </button>

        <span>{organizationName} • {ersepLicense}</span>
      </div>
    </div>
  );
}
