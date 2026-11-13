import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/quotes", "/customers", "/jobs"];

const PUBLIC_API_EXACT = new Set([
  "/api/payments/webhook",
  "/api/health",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/payments/create-preference",
]);

function isPublicApiRoute(pathname: string): boolean {
  if (PUBLIC_API_EXACT.has(pathname)) {
    return true;
  }
  // Exportación pública de presupuesto por publicToken (la ruta valida sesión o publicToken)
  if (/^\/api\/quotes\/[^/]+\/export\/(pdf|docx)$/.test(pathname)) {
    return true;
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const { response, user: supabaseUser, appUser, dbError } = await updateSession(req);
  const isAuthenticated = Boolean(supabaseUser && appUser && appUser.organizationId);

  // 1. Protección por defecto para todas las rutas /api/* salvo lista blanca mínima
  if (pathname.startsWith("/api/") || pathname === "/api") {
    if (isPublicApiRoute(pathname)) {
      return response;
    }

    // Ante un error transitorio de base de datos en endpoints de API, devolver 503
    if (dbError) {
      return NextResponse.json(
        { error: "Servicio temporalmente no disponible. Reintente en unos instantes." },
        { status: 503 }
      );
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    return response;
  }

  // 2. Ruta de login: si ya tiene sesión válida + fila User vinculada, redirigir al dashboard
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return response;
  }

  // 3. Rutas públicas de páginas (ficha pública /p/[token], retorno de pago)
  if (pathname.startsWith("/p/") || pathname.startsWith("/payments/")) {
    return response;
  }

  // 4. Rutas protegidas de la aplicación
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Ante error transitorio en páginas, dejamos pasar al Server Component para que getSession() decida
  if (isProtectedPage && !isAuthenticated && !dbError) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Excluir explícitamente:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico y archivos con extensiones de assets (png, jpg, jpeg, svg, ico, webp, json, txt, js, css, map)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|json|txt|js|css|map)$).*)",
  ],
};
