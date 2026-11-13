import { cache } from "react";
import prisma from "./db";
import { createClient } from "@/lib/supabase/server";

export type AppUserRole = "SUPERADMIN" | "OWNER" | "MEMBER";

export interface SessionOrganizationSummary {
  id: string;
  name: string;
  ersepLicenseNumber: string | null;
  ersepLicense: string | null;
  legalAddress: string | null;
  address: string | null;
  vatCondition: string;
  taxCondition: string;
  logoUrl: string | null;
}

export interface SessionUser {
  id: string;
  userId: string;
  authUserId: string;
  name: string;
  email: string;
  role: AppUserRole;
  organizationId: string;
  organizationName: string;
  ersepLicense: string;
  organization?: SessionOrganizationSummary;
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

async function resolveSessionUncached(): Promise<SessionUser | null> {
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
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            ersepLicenseNumber: true,
            ersepLicense: true,
            legalAddress: true,
            address: true,
            vatCondition: true,
            taxCondition: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.organizationId || !dbUser.organization) {
      try {
        await supabase.auth.signOut();
      } catch {}
      return null;
    }

    return {
      id: dbUser.id,
      userId: dbUser.id,
      authUserId: authUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as AppUserRole,
      organizationId: dbUser.organizationId,
      organizationName: dbUser.organization.name,
      ersepLicense:
        dbUser.organization.ersepLicenseNumber ||
        dbUser.organization.ersepLicense ||
        "Matrícula Habilitada ERSeP",
      organization: dbUser.organization,
    };
  } catch {
    return null;
  }
}

const resolveSessionCached = cache(resolveSessionUncached);

/**
 * Obtiene la sesión actual revalidando el token contra Supabase Auth (`getUser()`)
 * y buscando la fila `User` vinculada por `authUserId` en Prisma.
 * Deduplicado por request en producción/desarrollo mediante React `cache()`.
 */
export async function getSession(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV === "test") {
    return resolveSessionUncached();
  }
  return resolveSessionCached();
}

/**
 * Exige una sesión válida vinculada a un User y Organization en Prisma.
 * Falla cerrado: sin sesión en Supabase Auth -> 401; sin fila/organización en Prisma -> 403.
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
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          ersepLicenseNumber: true,
          ersepLicense: true,
          legalAddress: true,
          address: true,
          vatCondition: true,
          taxCondition: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!dbUser || !dbUser.organizationId || !dbUser.organization) {
    try {
      await supabase.auth.signOut();
    } catch {}
    throw new ForbiddenError("Cuenta sin organización o perfil asignado en el sistema");
  }

  return {
    id: dbUser.id,
    userId: dbUser.id,
    authUserId: authUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as AppUserRole,
    organizationId: dbUser.organizationId,
    organizationName: dbUser.organization.name,
    ersepLicense:
      dbUser.organization.ersepLicenseNumber ||
      dbUser.organization.ersepLicense ||
      "Matrícula Habilitada ERSeP",
    organization: dbUser.organization,
  };
}
