import { NextRequest, NextResponse } from "next/server";
import { getJobById, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { createPreference, generateWhatsAppLink } from "@/lib/mercadopago";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, quoteId, publicToken } = body;

    if (!jobId && !quoteId && !publicToken) {
      return NextResponse.json(
        { error: "Debe proporcionar jobId, quoteId o publicToken" },
        { status: 400 }
      );
    }

    const session = await getSession();
    let orgId = session?.organizationId;
    let title = "Servicio Eléctrico ElectroCba";
    let customerName = "Cliente";
    let customerPhone = "+5493510000000";
    const customerEmail = "cliente@electrocba.com.ar";
    let calculatedAmount = 0;
    let resolvedQuoteId: string | undefined;

    if (jobId) {
      if (!session) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      const job = await getJobById(jobId);
      if (!job || job.organizationId !== session.organizationId) {
        return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
      }
      orgId = job.organizationId;
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
                ...(quoteId ? [{ id: String(quoteId) }] : []),
                ...(publicToken ? [{ publicToken: String(publicToken) }] : []),
              ],
              deletedAt: null,
            }
          : {
              publicToken: String(publicToken),
              deletedAt: null,
            },
        include: { customer: true },
      });

      if (!quote) {
        return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
      }

      orgId = quote.organizationId;
      resolvedQuoteId = quote.id;
      calculatedAmount = Math.round(
        (quote.totalAmount * (quote.depositPercentage || 50)) / 100
      );
      title = `Seña ${quote.depositPercentage || 50}% - ${quote.title || "Trabajo Eléctrico"}`;
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
      jobId,
      quoteId: resolvedQuoteId || quoteId,
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
