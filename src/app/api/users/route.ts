import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsers, createUser } from "@/lib/services";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["SUPERADMIN", "OWNER", "MEMBER"]).default("MEMBER"),
  phone: z.string().optional(),
});

/**
 * GET /api/users
 * Lista todos los usuarios (Exclusivo Superadmin)
 */
export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Acceso denegado. Se requiere perfil de Superadministrador para auditar usuarios." },
      { status: 403 }
    );
  }

  try {
    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { error: "Error interno al recuperar el padrón de usuarios" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Da de alta un nuevo usuario (Exclusivo Superadmin)
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Acceso denegado. Únicamente la cuenta Superadministrador puede crear usuarios en la plataforma." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos de usuario inválidos", issues: result.error.issues },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      name: result.data.name,
      email: result.data.email,
      password: result.data.password,
      role: result.data.role,
      phone: result.data.phone,
      organizationId: session.organizationId,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
