import { NextRequest, NextResponse } from "next/server";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago";
import { recordPayment, convertQuoteToJob, getOrganization, getJobById } from "@/lib/services";
import prisma from "@/lib/db";

// Memoria rápida para idempotencia de eventos webhook
const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const body = await req.json().catch(() => ({}));
    const searchParams = req.nextUrl.searchParams;

    // Obtener data.id del body o del query param
    const dataId = String(body?.data?.id || searchParams.get("id") || body?.id || "");
    const eventType = body?.type || body?.action || searchParams.get("topic") || "payment";

    // 1. Validar firma del Webhook
    if (dataId && !verifyMercadoPagoSignature(xSignature, xRequestId, dataId)) {
      console.warn("⚠️ Firma de Webhook de Mercado Pago inválida:", { dataId, xSignature });
      return NextResponse.json({ error: "Firma de webhook inválida" }, { status: 401 });
    }

    // 2. Control de Idempotencia: no procesar la misma transacción dos veces
    const idempotencyKey = `mp_webhook_${dataId}`;
    if (processedEvents.has(idempotencyKey)) {
      return NextResponse.json({
        received: true,
        message: "Evento ya procesado previamente (idempotente)",
      });
    }

    // Si es un evento simulado o de test que envía detalles en body
    const amount = Number(body?.amount || body?.data?.amount || 0);
    const jobId = body?.jobId || body?.external_reference?.jobId;
    const quoteId = body?.quoteId || body?.external_reference?.quoteId;
    const status = body?.status || "approved";

    const org = await getOrganization();

    if (dataId) {
      processedEvents.add(idempotencyKey);
    }

    // Si es un pago aprobado y tenemos jobId o quoteId
    if (status === "approved" || status === "accredited") {
      let targetJobId = jobId;

      // Si el pago proviene de la seña de un presupuesto, lo convertimos a Job
      if (!targetJobId && quoteId) {
        const job = await convertQuoteToJob(quoteId);
        targetJobId = job.id;
      }

      if (targetJobId && amount > 0) {
        // Verificar en base de datos si ya existe el mpPaymentId
        try {
          const existingPayment = await prisma.payment.findFirst({
            where: { mpPaymentId: dataId },
          });

          if (!existingPayment) {
            await recordPayment(org.id, {
              jobId: targetJobId,
              amount,
              paymentMethod: "MERCADO_PAGO",
              mpPaymentId: dataId,
              notes: `Acreditado vía Webhook Mercado Pago (${eventType})`,
            });
            console.log(`✅ Pago de $${amount} registrado exitosamente para Job ${targetJobId}`);
          }
        } catch {
          // En caso de que se use el store en memoria
          await recordPayment(org.id, {
            jobId: targetJobId,
            amount,
            paymentMethod: "MERCADO_PAGO",
            mpPaymentId: dataId,
            notes: `Acreditado vía Webhook Mercado Pago (${eventType})`,
          });
        }
      }
    }

    return NextResponse.json({
      received: true,
      processed: true,
      dataId,
    });
  } catch (error: unknown) {
    console.error("Error al procesar webhook de Mercado Pago:", error);
    return NextResponse.json(
      { error: "Error interno en webhook", details: String(error) },
      { status: 500 }
    );
  }
}

// También permitir GET para verificaciones de endpoint que realiza Mercado Pago
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ElectroCba Mercado Pago Webhook Listener",
    timestamp: new Date().toISOString(),
  });
}
