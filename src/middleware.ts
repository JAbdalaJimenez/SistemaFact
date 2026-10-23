import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "electrocba_super_secret_jwt_key_2026_cordoba"
);

const SESSION_COOKIE_NAME = "electrocba_session";

// Rutas estrictamente protegidas que requieren autenticación
const PROTECTED_PREFIXES = ["/dashboard", "/quotes", "/customers", "/jobs"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas explícitas
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/payments") ||
    pathname.includes("/export/") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") // static assets
  ) {
    // Si ya está logueado e intenta ir a /login, redirigir a /dashboard
    if (pathname === "/login") {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        try {
          await jwtVerify(token, JWT_SECRET);
          return NextResponse.redirect(new URL("/dashboard", req.url));
        } catch {
          // Token inválido, continuar a login
        }
      }
    }
    return NextResponse.next();
  }

  // Verificar si la ruta requiere autenticación
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Validar token criptográficamente
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Token expirado o alterado
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
