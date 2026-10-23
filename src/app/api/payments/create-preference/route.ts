import { NextRequest, NextResponse } from "next/server";
import { getJobById, getQuotes, getOrganization } from "@/lib/services";
import { createPreference, generateWhatsAppLink } from "@/lib/mercadopago";

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

    const org = await getOrganization();
    let title = "Servicio Eléctrico ElectroCba";
    let customerName = "Cliente";
    let customerPhone = "+5493510000000";
    let customerEmail = "cliente@electrocba.com.ar";

    if (jobId) {
      const job = await getJobById(jobId);
      if (!job) {
        return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
      }
      title = `Saldo - ${job.title}`;
      customerName = job.customer.name;
      customerPhone = job.customer.phone;
    } else if (quoteId) {
      const quotes = await getQuotes();
      const quote = quotes.find((q) => q.id === quoteId);
      if (!quote) {
        return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
      }
      title = `Seña 50% - ${quote.title || "Trabajo Eléctrico"}`;
      customerName = quote.customer.name;
      customerPhone = quote.customer.phone;
    }

    const prefResult = await createPreference({
      title,
      amount: Number(amount),
      organizationId: org.id,
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
