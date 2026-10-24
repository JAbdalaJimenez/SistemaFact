import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppNavigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "ElectroCba | SaaS para Electricistas y Técnicos de Córdoba",
  description:
    "Gestión integral de presupuestos, órdenes de trabajo, matrícula ERSeP y cobranzas con Mercado Pago para instaladores electricistas en Córdoba, Argentina.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B132B",
};

import { getSession } from "@/lib/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#F8FAFC] text-[#0B132B] antialiased flex flex-col font-sans"
        suppressHydrationWarning
      >
        <AppNavigation initialUser={session} />
        <main className="flex-1 pb-20 sm:pb-12 max-w-5xl w-full mx-auto p-4 sm:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
