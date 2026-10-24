"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { customerSchema, CORDOBA_NEIGHBORHOODS, formatPhoneForWhatsApp } from "@/lib/types";

export default function NewCustomerPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    phone: "+54 9 351 ",
    address: "",
    neighborhood: "Nueva Córdoba",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validación cliente con Zod
    const result = customerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        fieldErrors[fieldName] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear comitente");
      }

      setSuccess(true);
      router.push("/customers");
      router.refresh();
    } catch (err: unknown) {
      alert(String(err));
      setLoading(false);
    }
  };

  const previewWaPhone = formatPhoneForWhatsApp(formData.phone);
  const previewWaUrl = `https://wa.me/${previewWaPhone}?text=${encodeURIComponent(
    `Estimado/a ${formData.name || "Titular"}, le saluda Marcos Romero de ElectroCba.`
  )}`;

  return (
    <div className="max-w-xl mx-auto space-y-6 font-sans">
      <div className="flex items-center space-x-3">
        <Link
          href="/customers"
          prefetch={true}
          className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:text-[#0B132B] shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </Link>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
            Padrón Oficial de Obras
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0B132B] tracking-tight">
            Registrar Nuevo Comitente
          </h1>
          <p className="text-xs text-[#475569] font-normal">
            Formulario normativo de titularidad con prefijo de Córdoba (+54 9 351)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-[#166534] text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" strokeWidth={1.5} />
            <span>Comitente registrado con éxito. Redirigiendo al directorio...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre Completo */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
              Nombre Completo o Razón Social *
            </label>
            <input
              type="text"
              name="name"
              placeholder="Ej: Sofía Martínez"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-normal text-[#0B132B] transition-all ${
                errors.name
                  ? "border-red-500 bg-red-50/20"
                  : "border-[#E2E8F0] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-700 mt-1 flex items-center gap-1 font-normal">
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} /> {errors.name}
              </p>
            )}
          </div>

          {/* Celular / WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B]">
                Teléfono Celular / WhatsApp *
              </label>
              {formData.phone.length > 8 && (
                <a
                  href={previewWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium text-[#166534] hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Verificar Canal</span>
                </a>
              )}
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" strokeWidth={1.5} />
              <input
                type="text"
                name="phone"
                placeholder="+54 9 351 688 7722"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-sm font-normal text-[#0B132B] tabular-nums transition-all ${
                  errors.phone
                    ? "border-red-500 bg-red-50/20"
                    : "border-[#E2E8F0] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-700 mt-1 flex items-center gap-1 font-normal">
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} /> {errors.phone}
              </p>
            )}
          </div>

          {/* Barrio de Córdoba */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
              Barrio de Córdoba *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" strokeWidth={1.5} />
              <select
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-normal text-[#0B132B] bg-white focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              >
                {CORDOBA_NEIGHBORHOODS.map((barrio) => (
                  <option key={barrio} value={barrio}>
                    {barrio}
                  </option>
                ))}
              </select>
            </div>
            {errors.neighborhood && (
              <p className="text-xs text-red-700 mt-1 font-normal">{errors.neighborhood}</p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
              Dirección de Domicilio / Inmueble *
            </label>
            <input
              type="text"
              name="address"
              placeholder="Ej: San Lorenzo 420, Dpto 7B"
              value={formData.address}
              onChange={handleChange}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-normal text-[#0B132B] transition-all ${
                errors.address
                  ? "border-red-500 bg-red-50/20"
                  : "border-[#E2E8F0] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              }`}
            />
            {errors.address && (
              <p className="text-xs text-red-700 mt-1 font-normal">{errors.address}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
              Observaciones del Emplazamiento
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Notas de consorcio, horarios de acceso o tablero existente..."
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-normal text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-3">
            <Link
              href="/customers"
              prefetch={true}
              className="w-1/3 py-2.5 px-4 text-center rounded-lg border border-[#E2E8F0] font-medium text-xs text-[#475569] hover:bg-[#F8FAFC] transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span>Guardando comitente...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" strokeWidth={1.5} />
                  <span>Registrar Comitente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
