import { NextRequest, NextResponse } from "next/server";
import { convertQuoteToJob, recordPayment } from "@/lib/services";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotes/[id]/approve
 * Aprueba un presupuesto formalmente y genera (o recupera) su Orden de Trabajo (Job).
 * Opcionalmente registra el pago de la seña inicial si el técnico lo confirma.
 */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const session = await getSession();

    // Verificar pertenencia del presupuesto si hay sesión activa
    if (session?.organizationId && session.role !== "SUPERADMIN") {
      try {
        const quote = await prisma.quote.findUnique({
          where: { id },
          select: { organizationId: true },
        });
        if (quote && quote.organizationId !== session.organizationId) {
          return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
      } catch {}
    }

    const job = await convertQuoteToJob(id);

    if (!job) {
      return NextResponse.json(
        { error: "No se pudo convertir el presupuesto en Orden de Trabajo" },
        { status: 400 }
      );
    }

    // Si se indica acreditar la seña manualmente al momento de aprobar
    if (body?.recordDeposit && Number(body?.depositAmount) > 0) {
      await recordPayment(job.organizationId, {
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
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
