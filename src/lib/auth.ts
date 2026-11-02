import prisma from "./db";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  userId: string;
  authUserId: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "MEMBER";
  organizationId: string;
  organizationName: string;
  ersepLicense: string;
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "No autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Sin permisos para acceder a este recurso") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Obtiene la sesión actual revalidando el usuario contra Supabase Auth (getUser)
 * y resolviendo su perfil y organización exclusivamente desde la tabla User de Prisma.
 * Nunca confía en user_metadata ni crea organizaciones por defecto.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser || !authUser.id) {
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { authUserId: authUser.id },
      include: { organization: true },
    });

    if (!dbUser || !dbUser.organizationId || !dbUser.organization) {
      return null;
    }

    return {
      id: dbUser.id,
      userId: dbUser.id,
      authUserId: authUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as "SUPERADMIN" | "OWNER" | "MEMBER",
      organizationId: dbUser.organizationId,
      organizationName: dbUser.organization.name,
      ersepLicense:
        dbUser.organization.ersepLicenseNumber ||
        dbUser.organization.ersepLicense ||
        "Matrícula Habilitada ERSeP",
    };
  } catch {
    return null;
  }
}

/**
 * Exige una sesión válida vinculada a un User y Organization en Prisma.
 * Lanza UnauthorizedError (401) si no hay sesión en Supabase Auth,
 * o ForbiddenError (403) si el usuario de Auth no tiene fila/organización en Prisma.
 */
export async function requireSession(): Promise<SessionUser> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser || !authUser.id) {
    throw new UnauthorizedError("Sesión no iniciada o expirada");
  }

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    include: { organization: true },
  });

  if (!dbUser || !dbUser.organizationId || !dbUser.organization) {
    throw new ForbiddenError("Cuenta sin organización asignada en el sistema");
  }

  return {
    id: dbUser.id,
    userId: dbUser.id,
    authUserId: authUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as "SUPERADMIN" | "OWNER" | "MEMBER",
    organizationId: dbUser.organizationId,
    organizationName: dbUser.organization.name,
    ersepLicense:
      dbUser.organization.ersepLicenseNumber ||
      dbUser.organization.ersepLicense ||
      "Matrícula Habilitada ERSeP",
  };
}
