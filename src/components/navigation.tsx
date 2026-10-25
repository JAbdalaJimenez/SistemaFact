"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Zap,
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  PlusCircle,
  ShieldCheck,
  LogOut,
  Settings,
  UserCog,
} from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "MEMBER";
  organizationName: string;
  ersepLicense?: string;
}

interface AppNavigationProps {
  initialUser?: CurrentUser | null;
}

export function AppNavigation({ initialUser = null }: AppNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(initialUser);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      try {
        sessionStorage.setItem("electrocba_user", JSON.stringify(initialUser));
      } catch {}
    }
  }, [initialUser]);

  useEffect(() => {
    // Sincronizar siempre con el endpoint de sesión para evitar datos viejos en sessionStorage
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user);
          try {
            sessionStorage.setItem("electrocba_user", JSON.stringify(data.user));
          } catch {}
        } else if (data && !data.authenticated) {
          setUser(null);
          try {
            sessionStorage.removeItem("electrocba_user");
          } catch {}
        }
      })
      .catch(() => {});

    // Precargar rutas críticas en segundo plano para respuesta táctil instantánea (0ms)
    try {
      router.prefetch("/dashboard/settings");
      router.prefetch("/dashboard/users");
      router.prefetch("/login");
    } catch {}
  }, [router]);

  const handleLogout = () => {
    // 1. Destrucción síncrona inmediata en el navegador (0ms)
    try {
      sessionStorage.clear();
      localStorage.removeItem("electrocba_user");
      document.cookie = "electrocba_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax;";
    } catch {}
    setUser(null);

    // 2. Notificación en segundo plano al servidor (fire & forget, nunca traba la UI)
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/auth/logout");
      } else {
        fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => {});
      }
    } catch {
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }

    // 3. Salida inmediata a login sin demoras
    window.location.replace("/login");
  };

  // No mostrar navegación en páginas públicas como /login, /p/[token] o checkout
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/payments/checkout")
  ) {
    return null;
  }

  const isSuperadmin = user?.role === "SUPERADMIN";

  // Navegación para pantallas grandes (Desktop)
  const desktopNavLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Clientes", icon: Users },
    { href: "/quotes/new", label: "Nuevo", icon: PlusCircle, isPrimary: true },
    { href: "/quotes", label: "Presupuestos", icon: FileText },
    { href: "/jobs", label: "Trabajos", icon: Briefcase },
    ...(isSuperadmin
      ? [{ href: "/dashboard/users", label: "Usuarios", icon: UserCog }]
      : []),
    { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
  ];

  // Navegación móvil simétrica (5 ítems) con el botón [+] exactamente en el centro
  const mobileNavLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Clientes", icon: Users },
    { href: "/quotes/new", label: "Cotizar", icon: PlusCircle, isPrimary: true },
    { href: "/quotes", label: "Presupuestos", icon: FileText },
    { href: "/jobs", label: "Trabajos", icon: Briefcase },
  ];

  return (
    <>
      {/* HEADER SUPERIOR (Mobile y Desktop) - Architectural Executive */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" prefetch={true} className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
            <div className="relative flex items-center shrink-0">
              <Image
                src="/logo-full.png"
                alt="ElectroCba - Ingeniería & Servicios Técnicos"
                width={195}
                height={40}
                className="h-8 sm:h-9 w-auto max-w-[140px] sm:max-w-none object-contain transition-transform group-hover:scale-[1.02]"
                priority
              />
            </div>
            <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
              <div className="flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-[#9A6E24]" />
                <span className="text-[10px] font-bold tracking-widest text-[#9A6E24] uppercase tabular-nums">
                  {user?.ersepLicense || "ERSeP Cat. III • Córdoba"}
                </span>
              </div>
              <span className="block text-[10px] text-[#64748B]">
                Córdoba Capital
              </span>
            </div>
          </Link>

          {/* PERFIL, USUARIOS (SUPERADMIN), AJUSTES Y BOTÓN LOGOUT */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="flex items-center justify-end gap-1.5" suppressHydrationWarning>
                <span className="text-xs font-semibold text-[#0B132B]" suppressHydrationWarning>
                  {user?.name || "Instalador Habilitado"}
                </span>
                <span
                  suppressHydrationWarning
                  className={`text-[9px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded border ${
                    user?.role === "OWNER"
                      ? "bg-[#0B132B] text-white border-[#1C2541]"
                      : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
                  }`}
                >
                  {user?.role || "OWNER"}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-[#475569] font-medium">
                {user?.organizationName || "ElectroCba"}
              </p>
            </div>

            {isSuperadmin && (
              <Link
                href="/dashboard/users"
                prefetch={true}
                title="Gestión de Usuarios (Superadmin)"
                aria-label="Gestión de Usuarios"
                className="w-10 h-10 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 active:scale-90 text-[#475569] hover:text-[#0B132B] border border-[#E2E8F0] flex items-center justify-center transition-all cursor-pointer shrink-0 touch-manipulation"
              >
                <UserCog className="w-5 h-5 text-[#9A6E24] pointer-events-none" strokeWidth={1.6} />
              </Link>
            )}

            <Link
              href="/dashboard/settings"
              prefetch={true}
              title="Configuración de la Organización"
              aria-label="Configuración de la Organización"
              className="w-10 h-10 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 active:scale-90 text-[#475569] hover:text-[#0B132B] border border-[#E2E8F0] flex items-center justify-center transition-all cursor-pointer shrink-0 touch-manipulation"
            >
              <Settings className="w-5 h-5 text-[#9A6E24] pointer-events-none" strokeWidth={1.6} />
            </Link>

            <button
              onClick={handleLogout}
              type="button"
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
              className="w-10 h-10 rounded-xl bg-[#F8FAFC] hover:bg-red-50 active:scale-90 text-[#475569] hover:text-red-700 border border-[#E2E8F0] hover:border-red-200 flex items-center justify-center transition-all cursor-pointer shrink-0 touch-manipulation"
            >
              <LogOut className="w-5 h-5 pointer-events-none text-slate-600 hover:text-red-700" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </header>

      {/* BARRA DE NAVEGACIÓN INFERIOR (5 Columnas Simétricas - Botón [+] en el Centro) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur border-t border-[#E2E8F0] pb-safe shadow-md">
        <div className="grid grid-cols-5 h-16 items-center px-1 max-w-md mx-auto">
          {mobileNavLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className="flex flex-col items-center justify-center -mt-6 group"
                >
                  <div className="w-13 h-13 rounded-2xl bg-[#0B132B] hover:bg-[#1C2541] text-white flex items-center justify-center shadow-md border-2 border-[#C5A059] ring-4 ring-white transition-all active:scale-95">
                    <PlusCircle className="w-7 h-7 text-[#C5A059]" strokeWidth={1.8} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B132B] mt-1">
                    Cotizar
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  isActive
                    ? "text-[#0B132B] font-semibold"
                    : "text-[#64748B] hover:text-[#0B132B]"
                }`}
              >
                <Icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                {isActive ? (
                  <span className="w-1 h-1 rounded-full bg-[#C5A059] mt-0.5"></span>
                ) : (
                  <span className="w-1 h-1 mt-0.5"></span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* MENÚ DE ESCRITORIO (Subheader horizontal - Corporate Authority) */}
      <div className="hidden sm:block bg-[#0B132B] text-white border-b border-[#1C2541]">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {desktopNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium tracking-wide transition-colors relative ${
                    isActive
                      ? "text-white bg-[#1C2541]"
                      : "text-slate-300 hover:text-white hover:bg-[#1C2541]/70"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#C5A059]" : "text-slate-400"
                    }`}
                    strokeWidth={1.5}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A059]" />
                  )}
                </Link>
              );
            })}
          </div>

          <Link
            href="/quotes/new"
            prefetch={true}
            className="bg-[#1C2541] hover:bg-[#2A3B5C] text-white border border-[#C5A059]/40 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
            <span>Emitir Presupuesto Formal</span>
          </Link>
        </div>
      </div>
    </>
  );
}
