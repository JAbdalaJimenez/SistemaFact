import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { createPreference, generateWhatsAppLink } from "@/lib/mercadopago";
import prisma from "@/lib/db";

const createPreferenceBodySchema = z
  .object({
    jobId: z.string().min(1).max(100).optional(),
    quoteId: z.string().min(1).max(100).optional(),
    publicToken: z.string().min(1).max(100).optional(),
  })
  .refine((d) => Boolean(d.jobId || d.quoteId || d.publicToken), {
    message: "Debe proporcionar jobId, quoteId o publicToken",
  });

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = createPreferenceBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos para generar preferencia", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { jobId, quoteId, publicToken } = parsed.data;
    const session = await getSession();

    let orgId = session?.organizationId;
    let title = "Servicio Eléctrico ElectroCba";
    let customerName = "Cliente";
    let customerPhone = "+5493510000000";
    const customerEmail = "cliente@electrocba.com.ar";
    let calculatedAmount = 0;
    let resolvedQuoteId: string | undefined;
    let resolvedJobId: string | undefined;

    if (jobId) {
      if (!session) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      const job = await prisma.job.findFirst({
        where: {
          id: jobId,
          organizationId: session.organizationId,
          deletedAt: null,
        },
        include: { customer: true },
      });
      if (!job) {
        return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
      }
      orgId = job.organizationId;
      resolvedJobId = job.id;
      calculatedAmount = job.balanceDue;
      title = `Saldo - ${job.title || "Trabajo Eléctrico"}`;
      customerName = job.customer?.name || "Cliente";
      customerPhone = job.customer?.phone || "+5493510000000";
    } else {
      if (!session && !publicToken) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      const quote = await prisma.quote.findFirst({
        where: session
          ? {
              organizationId: session.organizationId,
              OR: [
                ...(quoteId ? [{ id: quoteId }] : []),
                ...(publicToken ? [{ publicToken }] : []),
              ],
              deletedAt: null,
            }
          : {
              publicToken: publicToken!,
              deletedAt: null,
            },
        include: { customer: true },
      });

      if (!quote) {
        return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
      }

      orgId = quote.organizationId;
      resolvedQuoteId = quote.id;
      const pct = quote.depositPercentage || 50;
      calculatedAmount = Math.round((quote.totalAmount * pct) / 100);
      title = `Seña ${pct}% - ${quote.title || "Trabajo Eléctrico"}`;
      customerName = quote.customer?.name || "Cliente";
      customerPhone = quote.customer?.phone || "+5493510000000";
    }

    if (calculatedAmount <= 0 || !orgId) {
      return NextResponse.json(
        { error: "Monto inválido para generar preferencia" },
        { status: 400 }
      );
    }

    const org = await getOrganization(orgId);

    const prefResult = await createPreference({
      title,
      amount: calculatedAmount,
      organizationId: org.id,
      accessToken: org.mpAccessToken || undefined,
      jobId: resolvedJobId,
      quoteId: resolvedQuoteId,
      customerName,
      customerEmail,
    });

    const whatsappUrl = generateWhatsAppLink({
      phone: customerPhone,
      customerName,
      title,
      amount: calculatedAmount,
      paymentUrl: prefResult.shortUrl,
      type: resolvedQuoteId ? "quote_deposit" : "job_balance",
      organizationName: org.name,
      electricianName: org.legalName || org.name,
      ersepLicense: org.ersepLicenseNumber || org.ersepLicense || undefined,
    });

    return NextResponse.json({
      success: true,
      preferenceId: prefResult.id,
      initPoint: prefResult.initPoint,
      sandboxInitPoint: prefResult.sandboxInitPoint,
      shortUrl: prefResult.shortUrl,
      whatsappUrl,
      amount: calculatedAmount,
      title,
    });
  } catch (error: unknown) {
    console.error("Error al crear preferencia de Mercado Pago:", error);
    return NextResponse.json(
      { error: "Error interno al procesar pago con Mercado Pago" },
      { status: 500 }
    );
  }
}
