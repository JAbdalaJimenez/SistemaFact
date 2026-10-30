import { NextRequest, NextResponse } from "next/server";
import { getQuotes, getQuoteByPublicToken, getOrganization, isDatabaseOnline } from "@/lib/services";
import { generateQuotePdf } from "@/lib/pdf-generator";
import prisma from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json({ error: "Identificador de presupuesto inválido" }, { status: 400 });
    }

    // Buscar presupuesto por ID o por token público
    let quote: any = null;

    if (await isDatabaseOnline()) {
      try {
        quote = await prisma.quote.findFirst({
          where: {
            OR: [{ id }, { publicToken: id }],
            deletedAt: null,
          },
          include: {
            customer: true,
            organization: true,
            items: true,
          },
        });
      } catch {
        // Fallback
      }
    }

    if (!quote) {
      quote = await getQuoteByPublicToken(id);
    }

    if (!quote) {
      const allQuotes = await getQuotes();
      quote = allQuotes.find((q) => q.id === id || q.publicToken === id);
    }

    if (!quote) {
      return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
    }

    if (!quote.organization) {
      quote.organization = await getOrganization(quote.organizationId);
    }

    if (!quote.customer) {
      quote.customer = {
        name: "Comitente General",
        phone: "No informado",
        address: "Córdoba Capital",
        neighborhood: "Centro",
      };
    }

    const pdfBytes = await generateQuotePdf(quote);
    const safeId = quote.id ? String(quote.id) : "000000";
    const quoteNum =
      quote.quoteNumber ||
      `EC-${safeId.length >= 6 ? safeId.slice(-6).toUpperCase() : safeId.toUpperCase()}`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Presupuesto-${quoteNum}.pdf"`,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    return NextResponse.json(
      { error: "Error al generar archivo PDF", details: String(error) },
      { status: 500 }
    );
  }
}
