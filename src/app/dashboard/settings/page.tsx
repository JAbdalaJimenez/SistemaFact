"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Building2,
  FileText,
  CreditCard,
  Phone,
  MessageCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Upload,
  Eye,
  KeyRound,
  Banknote,
  MapPin,
  Sparkles,
} from "lucide-react";
import { OrganizationSettingsInput } from "@/lib/types";

export default function SettingsPage() {
  const [formData, setFormData] = useState<OrganizationSettingsInput>({
    name: "ElectroCba - Soluciones Eléctricas",
    legalName: "",
    ersepLicenseNumber: "",
    cuit: "",
    vatCondition: "Monotributo",
    legalAddress: "",
    phone: "",
    whatsappNumber: "",
    bankAlias: "",
    cbuCvu: "",
    mpAccessToken: "",
    mpPublicKey: "",
    logoUrl: "/logo-icon.png",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/organization", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.organization) {
          setFormData({
            name: data.organization.name || "",
            legalName: data.organization.legalName || "",
            ersepLicenseNumber: data.organization.ersepLicenseNumber || "",
            cuit: data.organization.cuit || "",
            vatCondition: data.organization.vatCondition || "Monotributo",
            legalAddress: data.organization.legalAddress || "",
            phone: data.organization.phone || "",
            whatsappNumber: data.organization.whatsappNumber || "",
            bankAlias: data.organization.bankAlias || "",
            cbuCvu: data.organization.cbuCvu || "",
            mpAccessToken: data.organization.mpAccessToken || "",
            mpPublicKey: data.organization.mpPublicKey || "",
            logoUrl: data.organization.logoUrl || "/logo-icon.png",
            email: data.organization.email || "",
          });
        }
      })
      .catch((err) => {
        console.error("Error al cargar configuración:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = (
    field: keyof OrganizationSettingsInput,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setErrorMessage("");

    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        throw new Error(data.error || `Error del servidor (${res.status})`);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      setErrorMessage(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans pb-16">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            prefetch={true}
            className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:text-[#0B132B] shadow-sm transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
                Configuración Multi-Tenant • Perfil Profesional
              </span>
              {loading && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#9A6E24] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Sincronizando
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0B132B] tracking-tight">
              Identidad del Instalador & Pasarelas
            </h1>
            <p className="text-xs text-[#475569] font-normal">
              Estos datos se interpolan dinámicamente en tus presupuestos web, PDF formal y contratos legales.
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#0B132B] hover:bg-[#1C2541] disabled:opacity-70 text-white font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Guardar Cambios</span>
              <span className="sm:hidden">Guardar</span>
            </>
          )}
        </button>
      </div>

      {/* MENSAJES DE ESTADO */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-medium">
            ¡Configuración actualizada con éxito! Los nuevos presupuestos y documentos PDF reflejarán estos datos de inmediato.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-xs font-medium">{errorMessage}</p>
        </div>
      )}

      {/* TARJETA PREVISUALIZACIÓN EN VIVO (LIVE BADGE) */}
      <div className="bg-[#0B132B] text-white p-5 rounded-2xl border border-[#1C2541] space-y-3 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A6E24] via-[#C5A059] to-[#9A6E24]" />
        <div className="flex items-center justify-between text-[11px] text-[#C5A059]">
          <span className="flex items-center gap-1 font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Vista previa del membrete oficial
          </span>
          <span className="text-[10px] text-slate-400">En tiempo real</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#1C2541] border border-[#C5A059]/40 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to placeholder if custom image fails
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <ShieldCheck className="w-6 h-6 text-[#C5A059]" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {formData.name || "ElectroCba"}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                {formData.legalName || "Nombre y Apellido del Titular"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 text-[#C5A059] font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  {formData.ersepLicenseNumber || "Matrícula ERSeP no configurada"}
                </span>
                <span>•</span>
                <span>CUIT: {formData.cuit || "Sin CUIT"}</span>
                <span>•</span>
                <span>{formData.vatCondition}</span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-300 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800 space-y-0.5">
            <p className="flex items-center sm:justify-end gap-1.5 text-slate-400">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{formData.legalAddress || "Córdoba Capital"}</span>
            </p>
            <p className="flex items-center sm:justify-end gap-1.5 text-slate-400">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{formData.phone || "Sin teléfono"}</span>
            </p>
            <p className="text-[10px] text-[#C5A059] font-mono">
              Alias: {formData.bankAlias || "Sin alias"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: IDENTIDAD PROFESIONAL Y MATRÍCULA ERSEP */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
                <span>1. Identidad Profesional y Habilitación ERSeP</span>
              </h2>
              <p className="text-xs text-[#475569]">
                Marco regulatorio de la Ley de Seguridad Eléctrica de Córdoba N° 10.281
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Nombre Comercial / Marca de Fantasía *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ej: ElectroCba - Soluciones Eléctricas"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Razón Social o Nombre y Apellido del Titular *
              </label>
              <input
                type="text"
                required
                value={formData.legalName || ""}
                onChange={(e) => handleChange("legalName", e.target.value)}
                placeholder="Ej: Ing. Electricista Habilitado / Razón Social"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Matrícula Habilitante ERSeP con Categoría *
              </label>
              <input
                type="text"
                required
                value={formData.ersepLicenseNumber || ""}
                onChange={(e) => handleChange("ersepLicenseNumber", e.target.value)}
                placeholder="Ej: ERSeP Cat. III - Mat. N° 14892"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                URL del Logotipo Profesional (PNG o SVG)
              </label>
              <input
                type="text"
                value={formData.logoUrl || ""}
                onChange={(e) => handleChange("logoUrl", e.target.value)}
                placeholder="/logo-icon.png o URL externa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: DATOS FISCALES ANTE ARCA / AFIP */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
              <span>2. Datos Tributarios y Fiscales (ARCA / AFIP)</span>
            </h2>
            <p className="text-xs text-[#475569]">
              Requeridos para el cumplimiento de la Ley 24.240 y validez jurídica del dictamen
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                CUIT / CUIL *
              </label>
              <input
                type="text"
                required
                value={formData.cuit || ""}
                onChange={(e) => handleChange("cuit", e.target.value)}
                placeholder="20-33445566-9"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Condición frente al IVA *
              </label>
              <select
                value={formData.vatCondition}
                onChange={(e) => handleChange("vatCondition", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] bg-white focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              >
                <option value="Monotributo">Monotributo (Prestador de Servicios)</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Exento">Exento</option>
              </select>
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Domicilio Legal en Córdoba *
              </label>
              <input
                type="text"
                required
                value={formData.legalAddress || ""}
                onChange={(e) => handleChange("legalAddress", e.target.value)}
                placeholder="Av. Colón 1450, B° Alberdi, Córdoba"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: CANALES DE CONTACTO Y WHATSAPP */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
              <span>3. Vías de Contacto Oficial con Comitentes</span>
            </h2>
            <p className="text-xs text-[#475569]">
              El comitente podrá confirmar presupuestos y enviar mensajes directamente a este número
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Teléfono de Contacto *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+54 9 351 512-3456"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                WhatsApp Oficial para Aprobaciones
              </label>
              <input
                type="text"
                value={formData.whatsappNumber || ""}
                onChange={(e) => handleChange("whatsappNumber", e.target.value)}
                placeholder="+54 9 351 512-3456"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Email Profesional
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contacto@electrocba.com.ar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: COBROS BANCARIOS DIRECTOS */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-2">
              <Banknote className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
              <span>4. Datos Bancarios para Transferencias Directas</span>
            </h2>
            <p className="text-xs text-[#475569]">
              Se incluirán en el contrato y ficha técnica para comitentes que prefieran transferir por CBU/CVU
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                Alias Bancario
              </label>
              <input
                type="text"
                value={formData.bankAlias || ""}
                onChange={(e) => handleChange("bankAlias", e.target.value)}
                placeholder="Ej: ELECTROCBA.MP o SERVICIOS.CBA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono uppercase text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                CBU o CVU (22 dígitos)
              </label>
              <input
                type="text"
                maxLength={22}
                value={formData.cbuCvu || ""}
                onChange={(e) => handleChange("cbuCvu", e.target.value)}
                placeholder="0000003100010000000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 5: INTEGRACIÓN MERCADO PAGO CHECKOUT PRO */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#009EE3]" strokeWidth={1.5} />
                <span>5. Pasarela Mercado Pago (Cobro Online de Señas 50%)</span>
              </h2>
              <p className="text-xs text-[#475569]">
                Permite cobrar señas con tarjetas, débito y dinero en cuenta vía Checkout Pro
              </p>
            </div>
            <span className="text-[10px] font-semibold bg-blue-50 text-[#009EE3] border border-blue-200 px-2 py-0.5 rounded self-start sm:self-auto">
              Checkout Pro Integrado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Mercado Pago Access Token (Opcional por Tenant)</span>
              </label>
              <input
                type="password"
                value={formData.mpAccessToken || ""}
                onChange={(e) => handleChange("mpAccessToken", e.target.value)}
                placeholder="APP_USR-... o TEST-... (dejar vacío para usar .env)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Si no se configura, se utilizará la clave centralizada de las variables de entorno.
              </p>
            </div>

            <div>
              <label className="block font-medium uppercase tracking-wider text-[#0B132B] mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Mercado Pago Public Key (Opcional por Tenant)</span>
              </label>
              <input
                type="text"
                value={formData.mpPublicKey || ""}
                onChange={(e) => handleChange("mpPublicKey", e.target.value)}
                placeholder="APP_USR-... o TEST-..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-mono text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Clave pública para inicializar componentes en el checkout frontend.
              </p>
            </div>
          </div>
        </div>

        {/* BOTÓN INFERIOR DE ACCIÓN */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-[#475569] hover:text-[#0B132B] hover:underline"
          >
            Volver al Panel Principal
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="bg-[#0B132B] hover:bg-[#1C2541] disabled:opacity-70 text-white font-medium text-xs sm:text-sm py-3 px-6 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                <span>Guardando Cambios...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
                <span>Guardar Configuración Profesional</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
