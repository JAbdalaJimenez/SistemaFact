import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsers, createUser } from "@/lib/services";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().trim().email("Correo electrónico inválido").max(100),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
  role: z.enum(["SUPERADMIN", "OWNER", "MEMBER"]).default("MEMBER"),
  phone: z.string().trim().max(25).optional(),
  shareCurrentOrg: z.boolean().optional(),
});

/**
 * GET /api/users
 * SUPERADMIN lista todos los usuarios; OWNER lista los miembros de su propia organización.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.role !== "SUPERADMIN" && session.role !== "OWNER") {
    return NextResponse.json(
      { error: "Acceso denegado. No tiene permisos para listar usuarios." },
      { status: 403 }
    );
  }

  try {
    const filterOrgId = session.role === "SUPERADMIN" ? undefined : session.organizationId;
    const users = await getUsers(filterOrgId);
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
 * Alta de nuevo usuario en Supabase Auth + Prisma:
 * - OWNER solo puede crear usuarios con rol MEMBER dentro de su propia organización (shareCurrentOrg = true forzado).
 * - Solo SUPERADMIN puede crear nuevas organizaciones o asignar roles OWNER / SUPERADMIN.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.role !== "SUPERADMIN" && session.role !== "OWNER") {
    return NextResponse.json(
      { error: "Acceso denegado. No tiene permisos para crear usuarios." },
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

    const isSuperadmin = session.role === "SUPERADMIN";

    if (!isSuperadmin && result.data.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Un titular (OWNER) solo puede dar de alta técnicos (MEMBER) dentro de su organización." },
        { status: 403 }
      );
    }

    const effectiveRole = isSuperadmin ? result.data.role : "MEMBER";
    const shareCurrentOrg = isSuperadmin ? Boolean(result.data.shareCurrentOrg) : true;

    const newUser = await createUser({
      name: result.data.name,
      email: result.data.email,
      password: result.data.password,
      role: effectiveRole,
      phone: result.data.phone,
      organizationId: session.organizationId,
      shareCurrentOrg,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error al crear usuario:", error);
    const rawMsg = error instanceof Error ? error.message : "";
    const isSafeMessage =
      rawMsg.includes("Ya existe") ||
      rawMsg.includes("inválido") ||
      rawMsg.includes("caracteres");
    return NextResponse.json(
      { error: isSafeMessage ? rawMsg : "Error al procesar el alta de usuario" },
      { status: 400 }
    );
  }
}
