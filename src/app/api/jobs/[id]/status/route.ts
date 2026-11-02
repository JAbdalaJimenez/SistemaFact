import { NextRequest, NextResponse } from "next/server";
import { updateJobStatus } from "@/lib/services";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const job = await prisma.job.findFirst({
      where: { id, organizationId: session.organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Orden de trabajo no encontrada" }, { status: 404 });
    }

    const updatedJob = await updateJobStatus(id, status);
    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error: unknown) {
    console.error("Error al actualizar estado del trabajo:", error);
    return NextResponse.json(
      { error: "Error al actualizar estado del trabajo" },
      { status: 500 }
    );
  }
}
