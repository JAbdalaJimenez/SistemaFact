import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteUser } from "@/lib/services";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/users/[id]
 * Elimina un usuario (Exclusivo Superadmin)
 */
export async function DELETE(req: NextRequest, { params }: Props) {
  const session = await getSession();

  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Acceso denegado. Se requiere perfil de Superadministrador." },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (id === session.id) {
    return NextResponse.json(
      { error: "No es posible eliminar la sesión actualmente autenticada." },
      { status: 400 }
    );
  }

  try {
    await deleteUser(id);
    return NextResponse.json({ success: true, message: "Usuario dado de baja exitosamente" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
