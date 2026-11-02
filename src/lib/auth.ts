import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "./db";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing session signing key in environment variables.");
  }
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE_NAME = "electrocba_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "MEMBER";
  organizationId: string;
  organizationName: string;
  ersepLicense: string;
}

/**
 * Genera un token JWT firmado para la sesión del usuario
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

/**
 * Verifica un token JWT
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión actual desde las cookies en Server Components / Server Actions
 * y sincroniza el organizationId con la base de datos.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || !session.id) return null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        organizationId: true,
        role: true,
        organization: {
          select: { name: true, ersepLicenseNumber: true, ersepLicense: true },
        },
      },
    });
    if (!dbUser) return null;

    session.organizationId = dbUser.organizationId;
    session.role = dbUser.role as "SUPERADMIN" | "OWNER" | "MEMBER";
    if (dbUser.organization) {
      session.organizationName = dbUser.organization.name;
      session.ersepLicense =
        dbUser.organization.ersepLicenseNumber ||
        dbUser.organization.ersepLicense ||
        session.ersepLicense;
    }
    return session;
  } catch {
    return null;
  }
}
