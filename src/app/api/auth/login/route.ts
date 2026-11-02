import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Debe ingresar email y contraseña" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    if (!dbUser || !dbUser.password) {
      return NextResponse.json(
        { error: "Credenciales inválidas. Verifique su email y contraseña." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(String(password), dbUser.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales inválidas. Verifique su email y contraseña." },
        { status: 401 }
      );
    }

    const user: SessionUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as "SUPERADMIN" | "OWNER" | "MEMBER",
      organizationId: dbUser.organizationId,
      organizationName: dbUser.organization.name,
      ersepLicense:
        dbUser.organization.ersepLicenseNumber ||
        dbUser.organization.ersepLicense ||
        "Matrícula Habilitada ERSeP",
    };

    const token = await createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno al iniciar sesión" },
      { status: 500 }
    );
  }
}
