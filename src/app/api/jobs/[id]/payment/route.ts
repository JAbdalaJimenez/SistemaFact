import { NextRequest, NextResponse } from "next/server";
import { recordPayment } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { manualPaymentSchema } from "@/lib/types";
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
    const body = await req.json();

    const job = await prisma.job.findFirst({
      where: { id, organizationId: session.organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Orden de trabajo no encontrada" }, { status: 404 });
    }

    const validated = manualPaymentSchema.parse({
      ...body,
      jobId: id,
    });

    const result = await recordPayment(session.organizationId, validated);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("Error al registrar pago manual:", error);
    return NextResponse.json(
      { error: "Error al registrar pago" },
      { status: 400 }
    );
  }
}
