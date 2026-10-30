import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { updateSession } from "@/utils/supabase/middleware";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "electrocba_super_secret_jwt_key_2026_cordoba"
);

const SESSION_COOKIE_NAME = "electrocba_session";

// Rutas estrictamente protegidas que requieren autenticación
const PROTECTED_PREFIXES = ["/dashboard", "/quotes", "/customers", "/jobs"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Actualizar sesión Supabase para persistencia de cookies en el cliente
  const { response, user: supabaseUser } = await updateSession(req);

  // Comprobar token legacy JWT si existe
  const customToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let hasValidCustomToken = false;
  if (customToken) {
    try {
      await jwtVerify(customToken, JWT_SECRET);
      hasValidCustomToken = true;
    } catch {
      hasValidCustomToken = false;
    }
  }

  const isAuthenticated = Boolean(supabaseUser) || hasValidCustomToken;

  // Rutas públicas explícitas
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/payments") ||
    pathname.includes("/export/") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") // static assets y favicon
  ) {
    // Si ya está logueado e intenta ir a /login, redirigir a /dashboard
    if (pathname === "/login" && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return response;
  }

  // Verificar si la ruta requiere autenticación
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const redirectRes = NextResponse.redirect(loginUrl);
      if (customToken && !hasValidCustomToken) {
        redirectRes.cookies.delete(SESSION_COOKIE_NAME);
      }
      return redirectRes;
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
