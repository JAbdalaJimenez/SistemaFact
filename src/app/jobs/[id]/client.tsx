"use client";

import { useState } from "react";
import {
  DollarSign,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Share2,
  Copy,
  MessageCircle,
  ExternalLink,
  PlusCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Sparkles,
  X,
} from "lucide-react";
import { formatCurrencyARS, formatPhoneForWhatsApp, formatDate } from "@/lib/types";

interface PaymentItem {
  id: string;
  amount: number;
  paymentMethod: "CASH" | "TRANSFER" | "MERCADO_PAGO";
  status: "PENDING" | "APPROVED" | "FAILED";
  mpPaymentId?: string | null;
  notes?: string | null;
  createdAt: string | Date;
}

interface Props {
  job: {
    id: string;
    title: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  initialStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  initialBalanceDue: number;
  totalAmount: number;
  totalPaid: number;
  initialPayments: PaymentItem[];
}

export function JobDetailsClient({
  job,
  initialStatus,
  initialBalanceDue,
  totalAmount,
  totalPaid: initialPaid,
  initialPayments,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [balanceDue, setBalanceDue] = useState(initialBalanceDue);
  const [payments, setPayments] = useState<PaymentItem[]>(initialPayments);
  const [statusLoading, setStatusLoading] = useState(false);

  // Estados del modal de pago manual
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualAmount, setManualAmount] = useState(initialBalanceDue > 0 ? initialBalanceDue : 10000);
  const [manualMethod, setManualMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [manualNotes, setManualNotes] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // Estados de generación de Link de Mercado Pago
  const [mpLoading, setMpLoading] = useState(false);
  const [mpLinkData, setMpLinkData] = useState<{
    shortUrl: string;
    whatsappUrl: string;
    amount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Actualizar estado del trabajo con actualización optimista instantánea (0ms)
  const handleStatusChange = async (newStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") => {
    const previousStatus = status;
    setStatus(newStatus); // Actualización inmediata en UI
    try {
      const res = await fetch(`/api/jobs/${job.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setStatus(previousStatus); // Revertir solo si falló
      }
    } catch (e) {
      console.error(e);
      setStatus(previousStatus);
    }
  };

  // Registrar cobro manual (Efectivo / Transferencia)
  const handleRegisterManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualAmount <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    const prevBalance = balanceDue;
    const prevPayments = payments;
    const prevStatus = status;

    // Actualización optimista inmediata en 0ms
    const newBalance = Math.max(0, balanceDue - manualAmount);
    setBalanceDue(newBalance);
    if (newBalance === 0) {
      setStatus("COMPLETED");
    }
    const tempId = `pay_${Date.now()}`;
    const paymentNote = manualNotes || (manualMethod === "CASH" ? "Pago recibido en efectivo" : "Transferencia bancaria directa");
    setPayments((prev) => [
      {
        id: tempId,
        amount: manualAmount,
        paymentMethod: manualMethod,
        status: "APPROVED",
        notes: paymentNote,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setShowManualModal(false);
    setManualNotes("");

    try {
      const res = await fetch(`/api/jobs/${job.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: manualAmount,
          paymentMethod: manualMethod,
          notes: paymentNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al registrar pago");
      }
      // Reemplazar id temporal por el de la BD
      if (data.payment?.id) {
        setPayments((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, id: data.payment.id } : p))
        );
      }
    } catch (err: unknown) {
      // Revertir en caso de error
      setBalanceDue(prevBalance);
      setPayments(prevPayments);
      setStatus(prevStatus);
      alert(String(err));
    }
  };

  // Generar link de pago oficial Mercado Pago
  const handleGenerateMpLink = async () => {
    if (balanceDue <= 0) {
      alert("Este trabajo ya no tiene saldo pendiente por cobrar.");
      return;
    }

    setMpLoading(true);
    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          amount: balanceDue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar link");
      }

      setMpLinkData({
        shortUrl: data.shortUrl || data.initPoint,
        whatsappUrl: data.whatsappUrl,
        amount: balanceDue,
      });
    } catch (err: unknown) {
      alert("Error: " + String(err));
    } finally {
      setMpLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (mpLinkData?.shortUrl) {
      navigator.clipboard.writeText(mpLinkData.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentPaid = totalAmount - balanceDue;
  const currentPaidPercentage = Math.min(
    100,
    Math.round((currentPaid / totalAmount) * 100)
  );

  return (
    <div className="space-y-6">
      {/* SELECTOR DE ESTADO DEL TRABAJO */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Estado Actual de la Obra
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                status === "COMPLETED"
                  ? "bg-green-100 text-[#15803D]"
                  : status === "IN_PROGRESS"
                  ? "bg-blue-100 text-[#1E40AF]"
                  : status === "SCHEDULED"
                  ? "bg-amber-100 text-[#B45309]"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {status === "COMPLETED" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              {status === "COMPLETED"
                ? "Finalizado"
                : status === "IN_PROGRESS"
                ? "En Curso"
                : status === "SCHEDULED"
                ? "Agendado"
                : "Cancelado"}
            </span>
            {statusLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
        </div>

        {/* BOTONES PARA CAMBIAR ESTADO */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleStatusChange("SCHEDULED")}
            disabled={statusLoading}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              status === "SCHEDULED"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Agendado
          </button>
          <button
            onClick={() => handleStatusChange("IN_PROGRESS")}
            disabled={statusLoading}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              status === "IN_PROGRESS"
                ? "bg-[#1E40AF] text-white border-[#1E40AF]"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            En Curso
          </button>
          <button
            onClick={() => handleStatusChange("COMPLETED")}
            disabled={statusLoading}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              status === "COMPLETED"
                ? "bg-[#15803D] text-white border-[#15803D]"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Finalizado
          </button>
        </div>
      </div>

      {/* PANEL DE CONTROL FINANCIERO Y BARRA DE PROGRESO DE PAGO */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#1E40AF]" />
          <span>Control Financiero & Cobranzas</span>
        </h2>

        {/* 3 TARJETAS DE IMPORTES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Pactado</span>
            <p className="text-xl font-black text-slate-900 mt-1">
              {formatCurrencyARS(totalAmount)}
            </p>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Cobrado Acumulado</span>
            <p className="text-xl font-black text-[#15803D] mt-1">
              {formatCurrencyARS(currentPaid)}
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${
            balanceDue > 0
              ? "bg-amber-50/70 border-amber-300 text-amber-900"
              : "bg-emerald-50 border-emerald-300 text-emerald-900"
          }`}>
            <span className="text-[10px] font-bold uppercase opacity-80">
              {balanceDue > 0 ? "Saldo Restante" : "Saldo Cancelado"}
            </span>
            <p className="text-xl font-black mt-1">
              {formatCurrencyARS(balanceDue)}
            </p>
          </div>
        </div>

        {/* BARRA DE PROGRESO VISUAL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Progreso del Pago: {currentPaidPercentage}%</span>
            <span>{balanceDue === 0 ? "100% Cobrado" : `Faltan ${formatCurrencyARS(balanceDue)}`}</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                currentPaidPercentage === 100
                  ? "bg-[#15803D]"
                  : currentPaidPercentage >= 50
                  ? "bg-[#1E40AF]"
                  : "bg-amber-500"
              }`}
              style={{ width: `${currentPaidPercentage}%` }}
            />
          </div>
        </div>

        {/* BOTONES DE ACCIÓN: COBRO MANUAL Y LINK MERCADO PAGO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              setManualAmount(balanceDue > 0 ? balanceDue : 10000);
              setShowManualModal(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
          >
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span>Registrar Cobro Manual (Efectivo/Transf.)</span>
          </button>

          <button
            onClick={handleGenerateMpLink}
            disabled={mpLoading || balanceDue <= 0}
            className="bg-[#009EE3] hover:bg-[#0089c7] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer disabled:opacity-60"
          >
            {mpLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando Link MP...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Generar Link de Pago Mercado Pago</span>
              </>
            )}
          </button>
        </div>

        {/* PANEL CON EL LINK DE MERCADO PAGO GENERADO */}
        {mpLinkData && (
          <div className="mt-4 p-4 bg-sky-50 border-2 border-[#009EE3] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#009EE3] uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" /> Link de Pago Generado por {formatCurrencyARS(mpLinkData.amount)}
              </span>
              <button
                onClick={() => setMpLinkData(null)}
                className="text-xs text-[#475569] hover:text-[#0B132B] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Cerrar</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={mpLinkData.shortUrl}
                className="w-full text-xs font-mono bg-white px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#0B132B]"
              />
              <button
                onClick={handleCopyLink}
                className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs px-3.5 py-2 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={mpLinkData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Enviar Link por WhatsApp al Cliente</span>
              </a>

              <a
                href={mpLinkData.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#009EE3] hover:bg-[#0089c7] text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Probar Cobro en Checkout MP</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* HISTORIAL DE PAGOS REGISTRADOS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900">
          Historial de Pagos y Acreditaciones ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No hay pagos registrados aún en esta orden.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => {
              const isMp = p.paymentMethod === "MERCADO_PAGO";
              const isCash = p.paymentMethod === "CASH";
              return (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        isMp
                          ? "bg-sky-100 text-[#009EE3]"
                          : isCash
                          ? "bg-emerald-100 text-[#15803D]"
                          : "bg-blue-100 text-[#1E40AF]"
                      }`}
                    >
                      {isMp ? (
                        <CreditCard className="w-4 h-4" />
                      ) : isCash ? (
                        <Banknote className="w-4 h-4" />
                      ) : (
                        <Building2 className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {isMp
                          ? "Mercado Pago"
                          : isCash
                          ? "Contado Efectivo"
                          : "Transferencia CBU"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {p.notes || "Cobro registrado"} • {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-sm">
                      +{formatCurrencyARS(p.amount)}
                    </span>
                    <span className="block text-[10px] font-bold text-emerald-600">
                      Acreditado
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR COBRO MANUAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-slate-900">
              Registrar Cobro Manual
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cobro recibido fuera de línea en efectivo o transferencia bancaria directa.
            </p>

            <form onSubmit={handleRegisterManualPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Monto Cobrado (ARS) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-extrabold text-slate-900 focus:border-[#1E40AF]"
                />
                {balanceDue > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Saldo restante del trabajo: {formatCurrencyARS(balanceDue)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Medio de Cobro *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualMethod("CASH")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      manualMethod === "CASH"
                        ? "bg-emerald-50 border-emerald-600 text-[#15803D]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualMethod("TRANSFER")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      manualMethod === "TRANSFER"
                        ? "bg-blue-50 border-blue-600 text-[#1E40AF]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Comentarios / Detalle de Comprobante
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cobrado en mano al finalizar o Comprobante N° 8491"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#1E40AF]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={manualLoading}
                  className="w-2/3 bg-[#15803D] hover:bg-green-700 text-white font-bold text-xs py-3 rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  {manualLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando Pago...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Pago de {formatCurrencyARS(manualAmount)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
