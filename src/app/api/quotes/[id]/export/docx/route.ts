import { NextRequest, NextResponse } from "next/server";
import { getQuotes, getQuoteByPublicToken } from "@/lib/services";
import { generateQuoteDocx } from "@/lib/docx-generator";
import prisma from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    let quote: any = null;

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

    const docxBuffer = await generateQuoteDocx(quote);
    const quoteNum = quote.quoteNumber || `EC-${quote.id.slice(-6).toUpperCase()}`;

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Presupuesto-ElectroCba-${quoteNum}.docx"`,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error al exportar DOCX:", error);
    return NextResponse.json(
      { error: "Error al generar archivo Word (.docx)", details: String(error) },
      { status: 500 }
    );
  }
}
