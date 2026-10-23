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
  Sparkles,
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
        throw new Error(data.error || "Error al crear cliente");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/customers");
      }, 1000);
    } catch (err: unknown) {
      alert(String(err));
      setLoading(false);
    }
  };

  const previewWaPhone = formatPhoneForWhatsApp(formData.phone);
  const previewWaUrl = `https://wa.me/${previewWaPhone}?text=${encodeURIComponent(
    `¡Hola ${formData.name || "Cliente"}! Te saluda Marcos de ElectroCba. ¿Cómo estás?`
  )}`;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          href="/customers"
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Registrar Nuevo Cliente
          </h1>
          <p className="text-xs text-slate-500">
            Formulario con validación Zod y prefijo de Córdoba (+54 9 351)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>¡Cliente guardado exitosamente! Redirigiendo al directorio...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre Completo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nombre y Apellido *
            </label>
            <input
              type="text"
              name="name"
              placeholder="Ej: Sofía Martínez"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                errors.name
                  ? "border-red-500 bg-red-50/30 focus:ring-red-200"
                  : "border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.name}
              </p>
            )}
          </div>

          {/* Celular / WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                WhatsApp Celular (Argentina) *
              </label>
              {formData.phone.length > 8 && (
                <a
                  href={previewWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Probar Chat
                </a>
              )}
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                name="phone"
                placeholder="+54 9 351 688 7722"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  errors.phone
                    ? "border-red-500 bg-red-50/30"
                    : "border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100"
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Formato sugerido: +54 9 351 XXXXXXX (habilita botón de WhatsApp instantáneo)
              </p>
            )}
          </div>

          {/* Barrio de Córdoba */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Barrio de Córdoba *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <select
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100"
              >
                {CORDOBA_NEIGHBORHOODS.map((barrio) => (
                  <option key={barrio} value={barrio}>
                    {barrio}
                  </option>
                ))}
              </select>
            </div>
            {errors.neighborhood && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.neighborhood}</p>
            )}
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Dirección y Número *
            </label>
            <input
              type="text"
              name="address"
              placeholder="Ej: Av. Hipólito Yrigoyen 380, Piso 4 Dpto B"
              value={formData.address}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                errors.address
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200 focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100"
              }`}
            />
            {errors.address && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.address}</p>
            )}
          </div>

          {/* Notas del trabajo o cliente */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Notas del Trabajo / Historial (Opcional)
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Ej: Tablero secundario con térmicas viejas. Coordinar horario con el consorcio."
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/customers"
              className="w-1/3 py-3.5 px-4 text-center rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 bg-[#1E40AF] hover:bg-blue-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Guardar Cliente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
