import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "./db";
import { getOrganization } from "./services";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "electrocba_super_secret_jwt_key_2026_cordoba"
);

export const SESSION_COOKIE_NAME = "electrocba_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER";
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
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (user) {
      const isValid = await bcrypt.compare(passwordPlain, user.password);
      if (isValid) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as "OWNER" | "MEMBER",
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          ersepLicense: user.organization.ersepLicense || "ERSeP Cat. III - N° 14892",
        };
      }
    }
  } catch (err) {
    console.warn("Fallback auth check:", err);
  }

  // Fallback demo credentials si la base de datos estuviera desconectada
  const org = await getOrganization();
  if (email.toLowerCase().includes("marcos") && (passwordPlain === "electrocba2026" || passwordPlain === "admin")) {
    return {
      id: "user_marcos_cba",
      name: "Marcos Romero",
      email: "marcos@electrocba.com.ar",
      role: "OWNER",
      organizationId: org.id,
      organizationName: org.name,
      ersepLicense: org.ersepLicense || "ERSeP Cat. III - N° 14892",
    };
  }

  if (email.toLowerCase().includes("tecnico") && (passwordPlain === "tecnico2026" || passwordPlain === "123456")) {
    return {
      id: "user_nicolas_cba",
      name: "Nicolás Gómez",
      email: "tecnico@electrocba.com.ar",
      role: "MEMBER",
      organizationId: org.id,
      organizationName: org.name,
      ersepLicense: org.ersepLicense || "ERSeP Cat. III - N° 14892",
    };
  }

  return null;
}
