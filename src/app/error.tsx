"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ElectroCba Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-[#9A6E24] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" strokeWidth={1.8} />
        </div>

        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-[#0B132B]">
            Sincronizando sesión del sistema
          </h2>
          <p className="text-xs text-[#475569]">
            Ocurrió una interrupción temporal al cargar la vista. Hacé clic en reintentar para continuar operando con normalidad.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Reintentar</span>
          </button>

          <a
            href="/dashboard"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-[#0B132B] text-xs font-medium flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Ir al Panel</span>
          </a>
        </div>
      </div>
    </div>
  );
}
