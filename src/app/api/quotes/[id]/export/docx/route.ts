import { NextRequest, NextResponse } from "next/server";
import { getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { generateQuoteDocx } from "@/lib/docx-generator";
import prisma from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json({ error: "Identificador de presupuesto inválido" }, { status: 400 });
    }

    const session = await getSession();

    // Con sesión: permite buscar por id o publicToken dentro de su organizationId.
    // Sin sesión: solo permite buscar por publicToken.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await prisma.quote.findFirst({
      where: session
        ? {
            organizationId: session.organizationId,
            OR: [{ id }, { publicToken: id }],
            deletedAt: null,
          }
        : {
            publicToken: id,
            deletedAt: null,
          },
      include: {
        customer: true,
        organization: true,
        items: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        { error: session ? "Presupuesto no encontrado" : "No autorizado o presupuesto no encontrado" },
        { status: session ? 404 : 401 }
      );
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

    const docxBuffer = await generateQuoteDocx(quote);
    const safeId = quote.id ? String(quote.id) : "000000";
    const quoteNum =
      quote.quoteNumber ||
      `EC-${safeId.length >= 6 ? safeId.slice(-6).toUpperCase() : safeId.toUpperCase()}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Presupuesto-${quoteNum}.docx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error al exportar DOCX:", error);
    return NextResponse.json(
      { error: "Error al generar archivo DOCX" },
      { status: 500 }
    );
  }
}
