import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/dashboard", "/quotes", "/customers", "/jobs"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const { response, user: supabaseUser } = await updateSession(req);
  const isAuthenticated = Boolean(supabaseUser);

  // Rutas públicas explícitas
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/payments") ||
    pathname.includes("/export/") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    if (pathname === "/login" && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return response;
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
