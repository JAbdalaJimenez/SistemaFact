import { NextRequest, NextResponse } from "next/server";
import { getJobById, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { createPreference, generateWhatsAppLink } from "@/lib/mercadopago";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, quoteId, amount } = body;

    if (!jobId && !quoteId) {
      return NextResponse.json(
        { error: "Debe proporcionar jobId o quoteId" },
        { status: 400 }
      );
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Monto inválido para generar preferencia" },
        { status: 400 }
      );
    }

    const session = await getSession();
    let orgId = session?.organizationId;
    let title = "Servicio Eléctrico ElectroCba";
    let customerName = "Cliente";
    let customerPhone = "+5493510000000";
    const customerEmail = "cliente@electrocba.com.ar";

    if (jobId) {
      const job = await getJobById(jobId);
      if (!job) {
        return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
      }
      orgId = job.organizationId || orgId;
      title = `Saldo - ${job.title || "Trabajo Eléctrico"}`;
      customerName = job.customer?.name || "Cliente";
      customerPhone = job.customer?.phone || "+5493510000000";
    } else if (quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { customer: true },
      }).catch(() => null);
      if (!quote) {
        return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
      }
      orgId = quote.organizationId || orgId;
      title = `Seña 50% - ${quote.title || "Trabajo Eléctrico"}`;
      customerName = quote.customer?.name || "Cliente";
      customerPhone = quote.customer?.phone || "+5493510000000";
    }

    const org = await getOrganization(orgId);

    const prefResult = await createPreference({
      title,
      amount: Number(amount),
      organizationId: org.id,
      accessToken: (org as any).mpAccessToken || undefined,
      jobId,
      quoteId,
      customerName,
      customerEmail,
    });

    const whatsappUrl = generateWhatsAppLink({
      phone: customerPhone,
      customerName,
      title,
      amount: Number(amount),
      paymentUrl: prefResult.shortUrl,
      type: quoteId ? "quote_deposit" : "job_balance",
      organizationName: org.name,
      electricianName: (org as any).legalName || org.name,
      ersepLicense: (org as any).ersepLicenseNumber || (org as any).ersepLicense,
    });

    return NextResponse.json({
      success: true,
      preferenceId: prefResult.id,
      initPoint: prefResult.initPoint,
      sandboxInitPoint: prefResult.sandboxInitPoint,
      shortUrl: prefResult.shortUrl,
      whatsappUrl,
      amount: Number(amount),
      title,
    });
  } catch (error: unknown) {
    console.error("Error al crear preferencia de Mercado Pago:", error);
    return NextResponse.json(
      { error: "Error interno al procesar pago con Mercado Pago", details: String(error) },
      { status: 500 }
    );
  }
}
