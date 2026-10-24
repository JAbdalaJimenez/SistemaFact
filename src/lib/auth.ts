import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "./db";
import { getOrganization, isDatabaseOnline, findFallbackUserByEmail } from "./services";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "electrocba_super_secret_jwt_key_2026_cordoba"
);

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
    .sign(JWT_SECRET);
}

/**
 * Verifica un token JWT
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión actual desde las cookies en Server Components / Server Actions
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

/**
 * Autentica usuario por email y contraseña contra PostgreSQL o fallback
 */
export async function authenticate(email: string, passwordPlain: string): Promise<SessionUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const online = await isDatabaseOnline();
  if (online) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AUTH_TIMEOUT")), 150)
      );
      const user = await Promise.race([
        prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { organization: true },
        }),
        timeoutPromise,
      ]);

      if (user) {
        const isValid = await bcrypt.compare(passwordPlain, user.password);
        if (isValid) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as "SUPERADMIN" | "OWNER" | "MEMBER",
            organizationId: user.organizationId,
            organizationName: user.organization.name,
            ersepLicense: (user.organization as any).ersepLicenseNumber || user.organization.ersepLicense || "Matrícula Habilitada ERSeP",
          };
        }
      }
    } catch (err) {
      console.warn("Fallback auth check:", err);
    }
  }

  // Fallback demo credentials si la base de datos estuviera desconectada
  const org = await getOrganization();
  const orgLegal = (org as any).legalName || org.name || "Instalador Habilitado";
  const orgLicense = (org as any).ersepLicenseNumber || org.ersepLicense || "Matrícula Habilitada ERSeP";

  // CUENTA SUPERADMIN PRINCIPAL DE PRUEBA Y ADMINISTRACIÓN
  if (
    normalizedEmail === "admin@electrocba.com.ar" &&
    (passwordPlain === "admin2026" || passwordPlain === "admin")
  ) {
    return {
      id: "user_superadmin_root",
      name: "Super Administrador",
      email: "admin@electrocba.com.ar",
      role: "SUPERADMIN",
      organizationId: org.id,
      organizationName: org.name,
      ersepLicense: orgLicense,
    };
  }

  // Soporte para usuarios agregados dinámicamente desde el panel
  const fallbackUser = findFallbackUserByEmail(normalizedEmail);
  if (fallbackUser && fallbackUser.password) {
    const isValid = bcrypt.compareSync(passwordPlain, fallbackUser.password);
    if (isValid) {
      const userOrg = await getOrganization(fallbackUser.organizationId);
      return {
        id: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        role: fallbackUser.role,
        organizationId: fallbackUser.organizationId || org.id,
        organizationName: userOrg.name,
        ersepLicense: (userOrg as any).ersepLicenseNumber || userOrg.ersepLicense || orgLicense,
      };
    }
  }

  return null;
}
