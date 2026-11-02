"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { formatCurrencyARS } from "@/lib/types";
import { CreditCard, Wallet, ShieldCheck, Loader2 } from "lucide-react";

function CheckoutMockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const title = searchParams.get("title") || "Servicio Técnico ElectroCba";
  const amount = Number(searchParams.get("amount") || 0);
  const jobId = searchParams.get("jobId") || "";
  const quoteId = searchParams.get("quoteId") || "";
  const prefId = searchParams.get("pref_id") || "MP-TEST";

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("wallet");

  const handlePay = async () => {
    setLoading(true);
    try {
      router.push(
        `/payments/status?status=approved&jobId=${jobId}&quoteId=${quoteId}&amount=${amount}`
      );
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-[#009EE3] p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#009EE3] font-black text-sm">
              MP
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold opacity-90">
                Mercado Pago (Sandbox Desarrollo)
              </p>
              <p className="text-sm font-bold">Checkout Pro Simulado</p>
            </div>
          </div>
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Entorno Dev
          </span>
        </div>

        <div className="p-6">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Concepto
            </span>
            <p className="text-sm font-medium text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {title}
            </p>
          </div>

          <div className="flex items-baseline justify-between mb-6">
            <span className="text-sm text-slate-600 font-medium">Total a abonar:</span>
            <span className="text-2xl font-extrabold text-[#1E40AF]">
              {formatCurrencyARS(amount)}
            </span>
          </div>

          <div className="space-y-2.5 mb-6">
            <label
              onClick={() => setPaymentMethod("wallet")}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === "wallet"
                  ? "border-[#009EE3] bg-blue-50/50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-[#009EE3]/10 flex items-center justify-center text-[#009EE3]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Dinero en cuenta Mercado Pago
                  </p>
                  <p className="text-xs text-slate-500">Acreditación instantánea</p>
                </div>
              </div>
              <input
                type="radio"
                name="mp_method"
                checked={paymentMethod === "wallet"}
                onChange={() => setPaymentMethod("wallet")}
                className="text-[#009EE3] focus:ring-[#009EE3]"
              />
            </label>

            <label
              onClick={() => setPaymentMethod("card")}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === "card"
                  ? "border-[#009EE3] bg-blue-50/50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Tarjeta de Débito o Crédito
                  </p>
                  <p className="text-xs text-slate-500">Hasta 12 cuotas fijas</p>
                </div>
              </div>
              <input
                type="radio"
                name="mp_method"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
                className="text-[#009EE3] focus:ring-[#009EE3]"
              />
            </label>
          </div>

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-[#009EE3] hover:bg-[#0089c7] text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Simulando pago...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Simular Pago ({formatCurrencyARS(amount)})</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-400 mt-4">
            Preferencia Dev: {prefId}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CheckoutMockClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <CheckoutMockContent />
    </Suspense>
  );
}
