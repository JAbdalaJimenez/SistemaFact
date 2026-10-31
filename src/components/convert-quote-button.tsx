"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface ConvertQuoteButtonProps {
  quoteId: string;
  isConverted?: boolean;
  existingJobId?: string | null;
}

export function ConvertQuoteButton({
  quoteId,
  isConverted = false,
  existingJobId = null,
}: ConvertQuoteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(existingJobId);

  if (jobId || isConverted) {
    return (
      <Link
        href={jobId ? `/jobs/${jobId}` : "/jobs"}
        className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
      >
        <Briefcase className="w-3.5 h-3.5" strokeWidth={1.8} />
        <span>Ver Trabajo</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    );
  }

  const handleConvert = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar la orden de trabajo");
      }
      if (data.jobId) {
        setJobId(data.jobId);
        router.push(`/jobs/${data.jobId}`);
        router.refresh();
      } else {
        router.push("/jobs");
        router.refresh();
      }
    } catch (err: unknown) {
      alert("No se pudo crear la Orden de Trabajo: " + String(err).replace("Error: ", ""));
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleConvert}
      disabled={loading}
      title="Aprobar presupuesto y pasar a Órdenes de Trabajo"
      className="bg-[#166534] hover:bg-[#14532D] disabled:opacity-60 text-white font-medium text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Iniciando...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" strokeWidth={1.8} />
          <span>Iniciar Obra</span>
        </>
      )}
    </button>
  );
}

