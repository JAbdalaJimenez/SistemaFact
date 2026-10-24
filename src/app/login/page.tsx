"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
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
        throw new Error(data.error || "Error al autenticar credenciales");
      }

      if (data.user) {
        try {
          sessionStorage.setItem("electrocba_user", JSON.stringify(data.user));
        } catch {}
      }

      // Redirigir al dashboard o ruta solicitada de inmediato
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

      if (data.user) {
        try {
          sessionStorage.setItem("electrocba_user", JSON.stringify(data.user));
        } catch {}
      }

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
              className="h-11 w-auto object-contain"
              priority
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#9A6E24] text-[10px] font-semibold px-2.5 py-0.5 rounded uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#9A6E24]" strokeWidth={1.5} />
              <span className="tabular-nums">ERSeP Cat. III • Matrícula 14892</span>
            </div>
            <p className="text-xs text-[#475569] mt-2 font-normal">
              Plataforma Institucional para Instaladores Electricistas de Córdoba
            </p>
          </div>
        </div>

        {/* TENANT / CONTEXTO DE NEGOCIO */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
            <div>
              <p className="font-semibold text-[#0B132B]">ElectroCba</p>
              <p className="text-[10px] text-[#475569] font-normal">Av. Colón 1450, B° Alberdi</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#0B132B] text-white px-2 py-0.5 rounded">
            Tenant Activo
          </span>
        </div>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700 font-normal">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#475569] mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" strokeWidth={1.5} />
              <input
                type="email"
                required
                autoComplete="username email"
                placeholder="marcos@electrocba.com.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-normal text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#475569] mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" strokeWidth={1.5} />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-normal text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer border border-[#1C2541] active:scale-[0.98]"
          >
            {loading ? (
              <span className="text-xs">Validando credenciales...</span>
            ) : (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider">Ingresar al Sistema</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
              </>
            )}
          </button>
        </form>

        {/* ACCESO RÁPIDO DEMOSTRACIÓN */}
        <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
          <span className="text-[10px] font-medium text-[#475569] uppercase tracking-wider block text-center">
            Perfiles de Prueba Verificados
          </span>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleQuickLogin("marcos@electrocba.com.ar", "electrocba2026")}
              className="w-full p-2.5 bg-[#F8FAFC] hover:bg-slate-100 text-[#0B132B] rounded-xl text-xs font-normal border border-[#E2E8F0] flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center space-x-2.5">
                <UserCheck className="w-4 h-4 text-[#9A6E24] shrink-0" strokeWidth={1.5} />
                <span className="flex flex-col">
                  <span className="font-semibold text-[#0B132B]">Marcos Romero (Titular)</span>
                  <span className="text-[10px] text-[#475569]">Rol: OWNER • Control Total</span>
                </span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase text-[#0B132B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] shadow-xs shrink-0 ml-2">
                <span>Acceder</span>
                <ArrowRight className="w-3 h-3 text-[#9A6E24]" strokeWidth={1.5} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("tecnico@electrocba.com.ar", "tecnico2026")}
              className="w-full p-2.5 bg-[#F8FAFC] hover:bg-slate-100 text-[#0B132B] rounded-xl text-xs font-normal border border-[#E2E8F0] flex items-center justify-between transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center space-x-2.5">
                <UserCheck className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.5} />
                <span className="flex flex-col">
                  <span className="font-semibold text-[#0B132B]">Nicolás Gómez (Técnico)</span>
                  <span className="text-[10px] text-[#475569]">Rol: MEMBER • Cuadrilla</span>
                </span>
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase text-[#0B132B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] shadow-xs shrink-0 ml-2">
                <span>Acceder</span>
                <ArrowRight className="w-3 h-3 text-[#9A6E24]" strokeWidth={1.5} />
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#475569]">Cargando acceso institucional...</div>}>
      <LoginContent />
    </Suspense>
  );
}
