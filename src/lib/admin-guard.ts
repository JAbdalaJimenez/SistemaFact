import { requireSession, ForbiddenError, type SessionUser } from "./auth";

/**
 * Exige sesión válida de Supabase Auth y rol SUPERADMIN validado contra la base de datos
 * (la fila `users` se resuelve por authUserId en requireSession). Falla cerrado.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "SUPERADMIN") {
    throw new ForbiddenError("Acceso restringido a administradores de plataforma");
  }
  return session;
}

