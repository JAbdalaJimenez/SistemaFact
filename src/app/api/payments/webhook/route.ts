import { NextRequest, NextResponse } from "next/server";
import {
  verifyMercadoPagoSignature,
  fetchPaymentFromMercadoPago,
} from "@/lib/mercadopago";
import { verifyExternalReference, decryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import prisma from "@/lib/db";

async function executePaymentTransaction(
  signedRef: NonNullable<ReturnType<typeof verifyExternalReference>>,
  verifiedMpPaymentId: string,
  paidAmount: number
) {
  return await prisma.$transaction(async (tx) => {
    const existingPayment = await tx.payment.findUnique({
      where: { mpPaymentId: verifiedMpPaymentId },
    });

    if (existingPayment) {
      return { idempotent: true, jobId: existingPayment.jobId };
    }

    let targetJobId = signedRef.jobId;

    if (!targetJobId && signedRef.quoteId) {
      const quote = await tx.quote.findFirst({
        where: {
          id: signedRef.quoteId,
          organizationId: signedRef.organizationId,
          deletedAt: null,
        },
        include: { job: true },
      });

      if (!quote) {
        throw new Error("Presupuesto asociado al pago no encontrado en la organización");
      }

      if (quote.job) {
        targetJobId = quote.job.id;
      } else {
        const newJob = await tx.job.create({
          data: {
            organizationId: quote.organizationId,
            customerId: quote.customerId,
            quoteId: quote.id,
            title: quote.title || "Trabajo Eléctrico Presupuestado",
            status: "IN_PROGRESS",
            totalAmount: quote.totalAmount,
            balanceDue: quote.totalAmount,
            scheduledDate: new Date(Date.now() + 2 * 86400000),
            notes: quote.notes,
          },
        });
        await tx.quote.update({
          where: { id: quote.id },
          data: { status: "CONVERTED" },
        });
        targetJobId = newJob.id;
      }
    }

    if (!targetJobId) {
      throw new Error("No se pudo determinar la orden de trabajo para acreditar el pago");
    }

    const job = await tx.job.findFirst({
      where: {
        id: targetJobId,
        organizationId: signedRef.organizationId,
        deletedAt: null,
      },
    });

    if (!job) {
      throw new Error("Orden de trabajo no encontrada en la organización");
    }

    await tx.payment.create({
      data: {
        organizationId: signedRef.organizationId,
        jobId: job.id,
        amount: paidAmount,
        paymentMethod: "MERCADO_PAGO",
        status: "APPROVED",
        mpPaymentId: verifiedMpPaymentId,
        notes: "Acreditado y verificado vía API Oficial Mercado Pago",
      },
    });

    const newBalance = Math.max(0, job.balanceDue - paidAmount);
    const shouldComplete = newBalance === 0 && job.status === "IN_PROGRESS";

    await tx.job.update({
      where: { id: job.id },
      data: {
        balanceDue: newBalance,
        ...(shouldComplete ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    });

    return { idempotent: false, jobId: job.id };
  });
}

export async function POST(req: NextRequest) {
  try {
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const body = await req.json().catch(() => ({}));
    const searchParams = req.nextUrl.searchParams;

    const dataId = String(
      body?.data?.id ||
        searchParams.get("data.id") ||
        searchParams.get("id") ||
        body?.id ||
        ""
    ).trim();

    // 1. Obtener orgId si está presente en la query de notification_url
    const orgIdHint = searchParams.get("orgId") || "";
    let orgWebhookSecret: string | null = null;
    let mpAccessToken = env.MERCADO_PAGO_ACCESS_TOKEN || "";

    if (orgIdHint) {
      const hintOrg = await prisma.organization.findUnique({
        where: { id: orgIdHint },
        select: { mpAccessToken: true, mpWebhookSecret: true },
      });
      if (hintOrg?.mpWebhookSecret) {
        orgWebhookSecret = decryptSecret(hintOrg.mpWebhookSecret);
      }
      if (hintOrg?.mpAccessToken) {
        mpAccessToken = decryptSecret(hintOrg.mpAccessToken);
      }
    }

    // 2. Validación obligatoria de firma SIEMPRE con el secreto específico de la organización o fallback global
    const isValidSignature =
      verifyMercadoPagoSignature(xSignature, xRequestId, dataId, orgWebhookSecret) ||
      (orgWebhookSecret ? verifyMercadoPagoSignature(xSignature, xRequestId, dataId, null) : false);

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Firma de webhook inválida o ausente" },
        { status: 401 }
      );
    }

    if (!mpAccessToken) {
      return NextResponse.json(
        { error: "Configuración de pasarela no disponible" },
        { status: 503 }
      );
    }

    // 3. Consultar el pago real en la API de Mercado Pago (nunca confiar en el body del webhook)
    const mpPayment = await fetchPaymentFromMercadoPago(dataId, mpAccessToken);
    const verifiedMpPaymentId = String(mpPayment.id);

    // 4. Verificar el external_reference firmado con HMAC
    const signedRef = verifyExternalReference(mpPayment.external_reference);
    if (!signedRef) {
      return NextResponse.json(
        { error: "Referencia externa inválida o adulterada" },
        { status: 400 }
      );
    }

    if (orgIdHint && signedRef.organizationId !== orgIdHint) {
      return NextResponse.json(
        { error: "Inconsistencia de organización en referencia externa" },
        { status: 400 }
      );
    }

    // Solo acreditar si el estado en la API oficial de Mercado Pago es aprobado
    if (mpPayment.status !== "approved" && mpPayment.status !== "accredited") {
      return NextResponse.json({
        received: true,
        processed: false,
        status: mpPayment.status,
      });
    }

    const paidAmount = Math.round(Number(mpPayment.transaction_amount));
    if (paidAmount <= 0 || paidAmount < signedRef.expectedAmount) {
      return NextResponse.json(
        { error: "El monto abonado no coincide con el monto esperado" },
        { status: 400 }
      );
    }

    // 5. Idempotencia y acreditación atómica en la base de datos con manejo estricto de P2002
    let txResult;
    try {
      txResult = await executePaymentTransaction(signedRef, verifiedMpPaymentId, paidAmount);
    } catch (txError: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = txError as any;
      if (err?.code === "P2002") {
        const metaTarget = Array.isArray(err?.meta?.target)
          ? err.meta.target.join(",")
          : String(err?.meta?.target || "");

        // Si la restricción única violada es mpPaymentId, es un pago duplicado confirmado -> 200 idempotente
        if (metaTarget.includes("mpPaymentId")) {
          return NextResponse.json({
            received: true,
            processed: false,
            idempotent: true,
          });
        }

        // Si fue otra restricción (ej: Job.quoteId por concurrencia), reintentar una vez
        console.warn("[Webhook] P2002 en target no-mpPaymentId (" + metaTarget + "), reintentando...");
        try {
          txResult = await executePaymentTransaction(signedRef, verifiedMpPaymentId, paidAmount);
        } catch (retryError: unknown) {
          console.error("[Webhook] Falló reintento de transacción:", retryError);
          return NextResponse.json(
            { error: "Error de concurrencia al acreditar pago. Mercado Pago reintentará." },
            { status: 500 }
          );
        }
      } else {
        throw txError;
      }
    }

    return NextResponse.json({
      received: true,
      processed: !txResult.idempotent,
      idempotent: txResult.idempotent,
      jobId: txResult.jobId,
    });
  } catch (error: unknown) {
    console.error("Error al procesar webhook de Mercado Pago:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la notificación de pago" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
  });
}
