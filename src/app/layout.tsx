import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppNavigation } from "@/components/navigation";
import { getSession } from "@/lib/auth";
import { AuthProvider } from "@/context/auth-context";

export const metadata: Metadata = {
  title: "ElectroCba | SaaS para Electricistas y Técnicos de Córdoba",
  description:
    "Gestión integral de presupuestos, órdenes de trabajo, matrícula ERSeP y cobranzas con Mercado Pago para instaladores electricistas en Córdoba, Argentina.",
  manifest: "/manifest.webmanifest",
  applicationName: "ElectroCba",
  appleWebApp: {
    capable: true,
    title: "ElectroCba",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/logo-icon.png",
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B132B",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ElectroCba" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className="min-h-screen bg-[#F8FAFC] text-[#0B132B] antialiased flex flex-col font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>
          <AppNavigation initialUser={session} />
          <main className="flex-1 pb-24 sm:pb-12 max-w-5xl w-full mx-auto p-4 sm:p-6 animate-fade-in">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
