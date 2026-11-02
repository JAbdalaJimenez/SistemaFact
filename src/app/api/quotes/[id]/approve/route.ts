import { NextRequest, NextResponse } from "next/server";
import { convertQuoteToJob, recordPayment } from "@/lib/services";
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
    const body = await req.json().catch(() => ({}));

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
        deletedAt: null,
      },
      select: { id: true, organizationId: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
    }

    const job = await convertQuoteToJob(id);

    if (!job) {
      return NextResponse.json(
        { error: "No se pudo convertir el presupuesto en Orden de Trabajo" },
        { status: 400 }
      );
    }

    if (body?.recordDeposit && Number(body?.depositAmount) > 0) {
      await recordPayment(session.organizationId, {
        jobId: job.id,
        amount: Math.round(Number(body.depositAmount)),
        paymentMethod: body.paymentMethod || "TRANSFER",
        notes: body.notes || "Seña inicial acreditada al aprobar presupuesto",
      });
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      job,
    });
  } catch (error: unknown) {
    console.error("[API Approve Quote] Error:", error);
    return NextResponse.json({ error: "Error al aprobar el presupuesto" }, { status: 500 });
  }
}
