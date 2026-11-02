import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteUser } from "@/lib/services";
import prisma from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/users/[id]
 * - Nadie puede eliminarse a sí mismo (session.userId === id).
 * - OWNER solo puede eliminar usuarios con rol MEMBER pertenecientes a su propia organización.
 * - Elimina en Prisma y también en Supabase Auth (auth.admin.deleteUser).
 */
export async function DELETE(_req: NextRequest, { params }: Props) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.role !== "SUPERADMIN" && session.role !== "OWNER") {
    return NextResponse.json(
      { error: "Acceso denegado. No tiene permisos para eliminar usuarios." },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (id === session.userId || id === session.id) {
    return NextResponse.json(
      { error: "No es posible eliminar la sesión actualmente autenticada." },
      { status: 400 }
    );
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (session.role === "OWNER") {
      if (
        targetUser.organizationId !== session.organizationId ||
        targetUser.role !== "MEMBER"
      ) {
        return NextResponse.json(
          { error: "Solo puede dar de baja miembros (MEMBER) de su propia organización." },
          { status: 403 }
        );
      }
    }

    await deleteUser(id);
    return NextResponse.json({ success: true, message: "Usuario dado de baja exitosamente" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al dar de baja al usuario";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
