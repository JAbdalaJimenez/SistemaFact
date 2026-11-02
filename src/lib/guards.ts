import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  SessionUser,
  AppUserRole,
  UnauthorizedError,
  ForbiddenError,
} from "./auth";

export { requireSession, UnauthorizedError, ForbiddenError };
export type { SessionUser, AppUserRole };

/**
 * Exige una sesión válida y que el rol del usuario esté dentro de `allowedRoles`.
 */
export async function requireRole(allowedRoles: AppUserRole[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    throw new ForbiddenError("No posee el rol requerido para realizar esta operación");
  }
  return session;
}

interface WithAuthOptions {
  roles?: AppUserRole[];
}

/**
 * Wrapper para Route Handlers de Next.js que garantiza autenticación,
 * autorización por rol y manejo estandarizado de errores 401/403.
 */
export function withAuth<TContext = unknown>(
  handler: (
    req: NextRequest,
    context: TContext & { session: SessionUser }
  ) => Promise<NextResponse> | NextResponse,
  options?: WithAuthOptions
) {
  return async (req: NextRequest, context: TContext): Promise<NextResponse> => {
    try {
      const session = options?.roles
        ? await requireRole(options.roles)
        : await requireSession();

      return await handler(req, { ...context, session });
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      console.error("[withAuth] Error no controlado en ruta:", error);
      return NextResponse.json(
        { error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  };
}

