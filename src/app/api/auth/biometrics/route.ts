import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getSession, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";
import {
  saveBiometricCredential,
  getBiometricCredential,
  findUserById,
  findFallbackUserByEmail,
  getOrganization,
  isDatabaseOnline,
} from "@/lib/services";
import prisma from "@/lib/db";

/**
 * Endpoint de gestión y autenticación biométrica (Face ID / Huella Dactilar)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. REGISTRO DE HUELLA / FACE ID
    if (action === "register") {
      const session = await getSession();
      const userId = body.userId || session?.id;
      const userEmail = body.userEmail || session?.email;
      const userName = body.userName || session?.name;
      const { credentialId, deviceName } = body;

      if (!userId || !userEmail || !credentialId) {
        return NextResponse.json(
          { error: "Faltan datos obligatorios para registrar el sensor biométrico." },
          { status: 400 }
        );
      }

      const cred = saveBiometricCredential({
        userId,
        userEmail,
        userName: userName || userEmail,
        credentialId,
        deviceName,
      });

      return NextResponse.json({
        success: true,
        message: "Sensor biométrico (Huella / Face ID) registrado con éxito.",
        credential: cred,
      });
    }

    // 2. INICIO DE SESIÓN CON HUELLA / FACE ID
    if (action === "login") {
      const { credentialId, email } = body;

      if (!credentialId && !email) {
        return NextResponse.json(
          { error: "Debe proveer una credencial o email para verificar la biometría." },
          { status: 400 }
        );
      }

      // Buscar credencial biométrica registrada
      const cred = getBiometricCredential(credentialId || email);

      // Si no está en el almacén de credenciales pero es una prueba directa con email
      let targetEmail = cred?.userEmail || email;
      let targetUserId = cred?.userId;

      if (!targetEmail) {
        return NextResponse.json(
          { error: "No se encontró registro biométrico asociado a este dispositivo." },
          { status: 404 }
        );
      }

      // Resolver usuario completo
      let resolvedUser: SessionUser | null = null;
      const normalizedEmail = targetEmail.toLowerCase().trim();

      // Caso Superadmin
      if (
        normalizedEmail === "admin@electrocba.com.ar" ||
        targetUserId === "user_superadmin_root"
      ) {
        const org = await getOrganization();
        resolvedUser = {
          id: "user_superadmin_root",
          name: "Super Administrador",
          email: "admin@electrocba.com.ar",
          role: "SUPERADMIN",
          organizationId: org.id,
          organizationName: org.name,
          ersepLicense: org.ersepLicenseNumber || org.ersepLicense || "Matrícula Habilitada ERSeP",
        };
      } else {
        // Buscar en DB o en fallbackStore
        const online = await isDatabaseOnline();
        if (online) {
          try {
            const dbUser = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: normalizedEmail },
                  ...(targetUserId ? [{ id: targetUserId }] : []),
                ],
              },
              include: { organization: true },
            });
            if (dbUser) {
              resolvedUser = {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role as "SUPERADMIN" | "OWNER" | "MEMBER",
                organizationId: dbUser.organizationId,
                organizationName: dbUser.organization.name,
                ersepLicense: (dbUser.organization as any).ersepLicenseNumber || dbUser.organization.ersepLicense || "Matrícula Habilitada ERSeP",
              };
            }
          } catch {}
        }

        if (!resolvedUser) {
          const fallbackUser =
            findFallbackUserByEmail(normalizedEmail) ||
            (targetUserId ? findUserById(targetUserId) : null);

          if (fallbackUser) {
            const org = await getOrganization(fallbackUser.organizationId);
            resolvedUser = {
              id: fallbackUser.id,
              name: fallbackUser.name,
              email: fallbackUser.email,
              role: fallbackUser.role,
              organizationId: fallbackUser.organizationId,
              organizationName: org.name,
              ersepLicense: org.ersepLicenseNumber || org.ersepLicense || "Matrícula Habilitada ERSeP",
            };
          }
        }
      }

      if (!resolvedUser) {
        return NextResponse.json(
          { error: "Usuario biométrico no encontrado o dado de baja." },
          { status: 404 }
        );
      }

      // Crear token de sesión JWT oficial
      const token = await createSessionToken(resolvedUser);

      const response = NextResponse.json({
        success: true,
        message: "Autenticación biométrica exitosa",
        user: resolvedUser,
      });

      // Configurar Cookie HTTP-Only oficial
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 días
      });

      return response;
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("Error en endpoint biométrico:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la solicitud biométrica" },
      { status: 500 }
    );
  }
}
