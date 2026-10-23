"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/navigation";
import NextLink from "next/link";
import { Suspense } from "react";
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Home } from "lucide-react";
import { formatCurrencyARS } from "@/lib/types";

function StatusContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const jobId = searchParams.get("jobId");
  const quoteId = searchParams.get("quoteId");
  const amount = Number(searchParams.get("amount") || 0);

  const isApproved = status === "approved";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        {isApproved ? (
          <>
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Pago Acreditado
            </span>

            <h1 className="text-2xl font-black text-slate-900 mt-4">
              ¡Operación Exitosa!
            </h1>

            <p className="text-slate-600 text-sm mt-2">
              El pago fue procesado correctamente a través de Mercado Pago.
            </p>

            {amount > 0 && (
              <div className="my-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Monto acreditado</span>
                <p className="text-3xl font-extrabold text-[#1E40AF]">
                  {formatCurrencyARS(amount)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Comprobante emitido por ElectroCba</p>
              </div>
            )}

            <div className="space-y-3 mt-6">
              {jobId && (
                <NextLink
                  href={`/jobs/${jobId}`}
                  className="w-full bg-[#1E40AF] hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all"
                >
                  <span>Ver Orden de Trabajo y Saldo Actualizado</span>
                  <ArrowRight className="w-4 h-4" />
                </NextLink>
              )}

              <NextLink
                href="/dashboard"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all text-sm"
              >
                <Home className="w-4 h-4" />
                <span>Ir al Panel Principal</span>
              </NextLink>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertCircle className="w-12 h-12" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">Pago Pendiente o Rechazado</h1>
            <p className="text-slate-600 text-sm mt-2">
              No pudimos confirmar la acreditación del pago en este momento. Por favor intentá nuevamente o comunicate con el técnico por WhatsApp.
            </p>

            <div className="mt-8">
              <NextLink
                href="/dashboard"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl block text-center"
              >
                Volver al Panel
              </NextLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Cargando estado...</div>}>
      <StatusContent />
    </Suspense>
  );
}
