"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
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
  Fingerprint,
  ScanFace,
  Smartphone,
  CheckCircle2,
  Sparkles,
  KeyRound,
} from "lucide-react";
import {
  isBiometricsAvailable,
  getSavedBiometricProfile,
  clearBiometricProfile,
  authenticateWithBiometrics,
  registerBiometricCredential,
  StoredBiometricProfile,
} from "@/lib/webauthn";

const supabase = createClient();

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");

  useEffect(() => {
    const cb = searchParams.get("callbackUrl");
    if (cb) setCallbackUrl(cb);
  }, [searchParams]);

  // Estados de formulario estándar
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de biometría (Face ID / Huella)
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [savedProfile, setSavedProfile] = useState<StoredBiometricProfile | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  // Modal para ofrecer activar huella tras el primer login
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [registeringBiometrics, setRegisteringBiometrics] = useState(false);

  // Inicializar detección biométrica al cargar
  useEffect(() => {
    async function checkBiometrics() {
      const available = await isBiometricsAvailable();
      setBiometricsSupported(available);
      const profile = getSavedBiometricProfile();
      if (profile) {
        setSavedProfile(profile);
      }
    }
    checkBiometrics();
  }, []);

  // 1. Acceso directo con sensor biométrico (Huella / Face ID)
  const handleBiometricAuth = async () => {
    if (!savedProfile) return;
    setError(null);
    setBiometricLoading(true);

    try {
      const res = await authenticateWithBiometrics(savedProfile);
      if (res.success && res.user) {
        setBiometricSuccess(true);
        try {
          sessionStorage.clear();
          sessionStorage.setItem("electrocba_user", JSON.stringify(res.user));
        } catch {}

        // Breve animación de éxito y redirección
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 500);
      }
    } catch (err: unknown) {
      const msg = String(err).replace("Error: ", "");
      if (
        msg.includes("NotAllowedError") ||
        msg.includes("cancel") ||
        msg.includes("abort")
      ) {
        setError("Autenticación biométrica cancelada. Puedes ingresar con tu contraseña.");
      } else {
        setError(msg || "No se pudo verificar la huella o Face ID.");
      }
      setBiometricLoading(false);
    }
  };

  // Olvidar el perfil biométrico de este dispositivo
  const handleForgetBiometric = () => {
    clearBiometricProfile();
    setSavedProfile(null);
    setShowPasswordFallback(true);
  };

  // 2. Inicio de sesión estándar con Email y Contraseña
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Intentar autenticación mediante Supabase Auth para persistir la sesión en Supabase y sus cookies
      let supabaseUser: any = null;
      try {
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!sbError && sbData?.user) {
          supabaseUser = sbData.user;
        }
      } catch (sbErr) {
        console.warn("[Login] Supabase Auth sign-in aviso:", sbErr);
      }

      // 2. Sincronizar con el backend de ElectroCba para perfil y credenciales
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok && !supabaseUser) {
        throw new Error(data.error || "Credenciales inválidas");
      }

      const activeUser = data.user || {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "Usuario",
        role: "MEMBER",
      };

      // Limpiar contexto previo y guardar el nuevo usuario
      try {
        sessionStorage.clear();
        if (activeUser) {
          sessionStorage.setItem("electrocba_user", JSON.stringify(activeUser));
        }
      } catch {}

      // Si el dispositivo soporta Face ID / Huella y no tiene registrado a este usuario aún:
      // Ofrecemos activar la biometría antes de ir al dashboard
      if (
        biometricsSupported &&
        activeUser &&
        (!savedProfile || savedProfile.userId !== activeUser.id)
      ) {
        setAuthenticatedUser({
          id: activeUser.id,
          email: activeUser.email,
          name: activeUser.name,
        });
        setLoading(false);
        setShowOfferModal(true);
        return;
      }

      // Si ya está registrado o el dispositivo no soporta biometría, redirigir
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  };

  // 3. Confirmar registro de sensor biométrico
  const handleConfirmRegisterBiometrics = async () => {
    if (!authenticatedUser) return;
    setRegisteringBiometrics(true);
    setError(null);

    try {
      const profile = await registerBiometricCredential(authenticatedUser);
      setSavedProfile(profile);
      setShowOfferModal(false);
      // Redirigir al dashboard con éxito
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      console.warn("Registro biométrico omitido o cancelado:", err);
      // Si cancela, igual ya está logueado por contraseña, así que redirigir
      setShowOfferModal(false);
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setRegisteringBiometrics(false);
    }
  };

  // Omitir registro de sensor biométrico y continuar al dashboard
  const handleSkipRegisterBiometrics = () => {
    setShowOfferModal(false);
    router.push(callbackUrl);
    router.refresh();
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
              <span className="tabular-nums">Habilitación Oficial ERSeP • Ley 10.281</span>
            </div>
            <p className="text-xs text-[#475569] mt-2 font-normal">
              Plataforma Institucional para Instaladores Electricistas de Córdoba
            </p>
          </div>
        </div>

        {/* TENANT / CONTEXTO INSTITUCIONAL */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
            <div>
              <p className="font-semibold text-[#0B132B]">ElectroCba</p>
              <p className="text-[10px] text-[#475569] font-normal">SaaS Multi-Inquilino Certificado</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#0B132B] text-white px-2 py-0.5 rounded">
            Tenant Seguro
          </span>
        </div>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700 font-normal animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* VISTA 1: ACCESO RÁPIDO CON BIOMETRÍA (FACE ID / HUELLA)      */}
        {/* ============================================================ */}
        {savedProfile && !showPasswordFallback ? (
          <div className="space-y-4 pt-1">
            <div className="p-5 bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] border border-[#CBD5E1] rounded-2xl text-center space-y-3.5 shadow-sm">
              <div className="relative mx-auto w-16 h-16 rounded-full bg-[#0B132B] text-[#C5A059] flex items-center justify-center shadow-md">
                {biometricSuccess ? (
                  <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-bounce" strokeWidth={2} />
                ) : (
                  <>
                    <Fingerprint className="w-8 h-8 text-[#C5A059]" strokeWidth={1.6} />
                    <ScanFace className="w-4 h-4 text-white absolute bottom-1 right-1" strokeWidth={2} />
                  </>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-[#64748B] font-semibold">
                  Acceso Biométrico Rápido
                </p>
                <h3 className="text-base font-bold text-[#0B132B] mt-0.5">
                  {savedProfile.name}
                </h3>
                <p className="text-xs text-[#475569] font-mono mt-0.5">
                  {savedProfile.email}
                </p>
                {savedProfile.deviceName && (
                  <div className="inline-flex items-center gap-1 mt-2 text-[10px] text-[#475569] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                    <Smartphone className="w-3 h-3 text-[#9A6E24]" />
                    <span>{savedProfile.deviceName}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={biometricLoading || biometricSuccess}
                className="w-full bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-75 cursor-pointer border border-[#1C2541] active:scale-[0.98]"
              >
                {biometricLoading ? (
                  <span className="text-xs font-semibold">Coloca tu huella o mira la pantalla...</span>
                ) : biometricSuccess ? (
                  <span className="text-xs font-semibold text-emerald-300">¡Identidad confirmada! Ingresando...</span>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 text-[#C5A059]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Desbloquear con Face ID / Huella
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 px-1 text-[#64748B]">
              <button
                type="button"
                onClick={() => setShowPasswordFallback(true)}
                className="hover:text-[#0B132B] underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ingresar con contraseña</span>
              </button>

              <button
                type="button"
                onClick={handleForgetBiometric}
                className="hover:text-red-600 text-[11px] cursor-pointer"
              >
                Cambiar de usuario
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* VISTA 2: FORMULARIO ESTÁNDAR EMAIL + CONTRASEÑA              */
          /* ============================================================ */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                  placeholder="ejemplo@electrocba.com.ar"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  suppressHydrationWarning
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-normal text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B] outline-none transition-all"
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-normal text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B] outline-none transition-all"
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

            {savedProfile && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordFallback(false)}
                  className="text-xs text-[#0B132B] hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Volver a acceso con Huella / Face ID</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* NOTA AL PIE SOBRE BIOMETRÍA EN TELÉFONOS */}
        {biometricsSupported && (
          <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <Smartphone className="w-3.5 h-3.5 text-[#9A6E24]" />
            <span>Compatible con Face ID, Touch ID y Huella en teléfonos</span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: OFRECER ACTIVAR BIOMETRÍA TRAS EL PRIMER LOGIN        */}
      {/* ============================================================ */}
      {showOfferModal && authenticatedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#CBD5E1] text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-[#0B132B] text-[#C5A059] mx-auto flex items-center justify-center shadow-lg relative">
              <Fingerprint className="w-8 h-8" strokeWidth={1.8} />
              <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#0B132B]">
                ¿Activar Face ID / Huella dactilar?
              </h3>
              <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                Detectamos que tu teléfono soporta identificación biométrica. Actívalo para ingresar en 1 segundo en tus próximas visitas sin volver a escribir tu contraseña.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl text-left text-xs space-y-1">
              <div className="font-semibold text-[#0B132B]">{authenticatedUser.name}</div>
              <div className="text-[11px] text-[#64748B] font-mono">{authenticatedUser.email}</div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmRegisterBiometrics}
                disabled={registeringBiometrics}
                className="w-full bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {registeringBiometrics ? (
                  <span className="text-xs">Registrando sensor en tu teléfono...</span>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 text-[#C5A059]" />
                    <span className="text-xs font-semibold">Activar en este dispositivo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipRegisterBiometrics}
                disabled={registeringBiometrics}
                className="w-full bg-transparent hover:bg-slate-100 text-[#64748B] font-medium py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Ahora no, ingresar al panel
              </button>
            </div>
          </div>
        </div>
      )}
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
