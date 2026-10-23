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
  User,
} from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER";
  organizationName: string;
}

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  // No mostrar navegación en páginas públicas como /login, /p/[token] o checkout
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/payments/checkout")
  ) {
    return null;
  }

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Clientes", icon: Users },
    { href: "/quotes/new", label: "Nuevo", icon: PlusCircle, isPrimary: true },
    { href: "/quotes", label: "Presupuestos", icon: FileText },
    { href: "/jobs", label: "Trabajos", icon: Briefcase },
  ];

  return (
    <>
      {/* HEADER SUPERIOR (Mobile y Desktop) - Architectural Executive */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="relative flex items-center">
              <Image
                src="/logo-full.png"
                alt="ElectroCba - Ingeniería & Servicios Técnicos"
                width={195}
                height={40}
                className="h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                priority
              />
            </div>
            <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
              <div className="flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-[#9A6E24]" />
                <span className="text-[10px] font-bold tracking-widest text-[#9A6E24] uppercase tabular-nums">
                  ERSeP Cat. III • Mat. 14892
                </span>
              </div>
              <span className="block text-[10px] text-[#64748B]">
                Córdoba Capital
              </span>
            </div>
          </Link>

          {/* PERFIL Y BOTÓN LOGOUT */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <div className="flex items-center justify-end gap-1.5" suppressHydrationWarning>
                <span className="text-xs font-semibold text-[#0F172A]" suppressHydrationWarning>
                  {user?.name || "Marcos Romero"}
                </span>
                <span
                  suppressHydrationWarning
                  className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                    user?.role === "OWNER"
                      ? "bg-[#0F172A] text-white border-[#1E293B]"
                      : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]"
                  }`}
                >
                  {user?.role || "OWNER"}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-[#64748B] font-medium">
                Instalador Habilitado
              </p>
            </div>

            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="w-9 h-9 rounded-xl bg-[#F8FAFC] hover:bg-red-50 text-[#64748B] hover:text-red-600 border border-[#E2E8F0] hover:border-red-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* BARRA DE NAVEGACIÓN INFERIOR (Mobile-First 390px) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] pb-safe shadow-lg">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white flex items-center justify-center shadow-lg border border-[#C5A059]/40 ring-4 ring-[#F8FAFC] transition-transform active:scale-95">
                    <PlusCircle className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#0F172A] mt-1">
                    Cotizar
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  isActive
                    ? "text-[#0F172A] font-bold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "stroke-[2.5] text-[#0F172A]" : "stroke-[1.75]"
                  }`}
                />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#C5A059] mt-0.5"></span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* MENÚ DE ESCRITORIO (Subheader horizontal - Architectural Executive) */}
      <div className="hidden sm:block bg-[#0F172A] text-white border-b border-[#1E293B]">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium tracking-wide transition-colors relative ${
                    isActive
                      ? "text-white bg-[#1E293B]"
                      : "text-slate-400 hover:text-white hover:bg-[#1E293B]/60"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#C5A059]" : "text-slate-400"
                    }`}
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
            className="bg-[#1E293B] hover:bg-[#334155] text-white border border-[#C5A059]/40 text-xs font-semibold py-1.5 px-3.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Emitir Presupuesto Formal</span>
          </Link>
        </div>
      </div>
    </>
  );
}
