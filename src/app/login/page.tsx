"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building2,
  UserCheck,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");

  useEffect(() => {
    const cb = searchParams.get("callbackUrl");
    if (cb) setCallbackUrl(cb);
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al autenticar");
      }

      // Redirigir al dashboard o ruta solicitada
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  };

  // Botón para inicio de sesión rápido en modo demo
  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-6 px-4 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] space-y-6">
        {/* LOGO Y MEMBRETE */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/logo-full.png"
              alt="ElectroCba - Ingeniería & Servicios Técnicos"
              width={260}
              height={55}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-[#EADFC7] text-[#9A6E24] text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-[#9A6E24]" />
              <span className="tabular-nums">ERSeP Cat. III • Mat. 14892</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Plataforma Ejecutiva para Instaladores Electricistas de Córdoba
            </p>
          </div>
        </div>

        {/* TENANT / CONTEXTO DE NEGOCIO */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-[#9A6E24]" />
            <div>
              <p className="font-semibold text-[#0F172A]">ElectroCba</p>
              <p className="text-[10px] text-[#64748B]">Av. Colón 1450, B° Alberdi</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0F172A] text-white px-2 py-0.5 rounded">
            Tenant Activo
          </span>
        </div>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                autoComplete="username email"
                placeholder="marcos@electrocba.com.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer border border-[#1E293B] active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                <span className="text-xs">Validando credenciales...</span>
              </>
            ) : (
              <>
                <span className="text-xs font-bold uppercase tracking-wider">Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
              </>
            )}
          </button>
        </form>

        {/* ACCESO RÁPIDO DEMOSTRACIÓN */}
        <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">
            Acceso Rápido de Demostración
          </span>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("marcos@electrocba.com.ar", "electrocba2026")}
              className="w-full p-2.5 bg-[#FAF8F5] hover:bg-[#F4EFE3] text-[#0F172A] rounded-xl text-xs font-semibold border border-[#EADFC7] flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-[#9A6E24] shrink-0" />
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-800">Marcos Romero (Titular)</span>
                  <span className="text-[10px] font-normal text-[#64748B]">Rol: OWNER • Acceso total</span>
                </span>
              </span>
              <span className="text-[10px] font-bold uppercase text-[#9A6E24] bg-white px-2 py-0.5 rounded border border-[#EADFC7] shadow-xs shrink-0 ml-2">
                Ingresar ➔
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("tecnico@electrocba.com.ar", "tecnico2026")}
              className="w-full p-2.5 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] rounded-xl text-xs font-semibold border border-[#E2E8F0] flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-800">Nicolás Gómez (Técnico)</span>
                  <span className="text-[10px] font-normal text-[#64748B]">Rol: MEMBER • Cuadrilla</span>
                </span>
              </span>
              <span className="text-[10px] font-bold uppercase text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] shadow-xs shrink-0 ml-2">
                Ingresar ➔
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Cargando acceso...</div>}>
      <LoginContent />
    </Suspense>
  );
}
