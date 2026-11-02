import { NextRequest, NextResponse } from "next/server";
import { getQuotes, createQuote } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { quoteCreateSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const quotes = await getQuotes(session.organizationId);
    return NextResponse.json(quotes, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("[API Quotes GET] Error:", error);
    return NextResponse.json({ error: "Error al obtener presupuestos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const validated = quoteCreateSchema.parse(body);

    const newQuote = await createQuote(session.organizationId, validated);

    return NextResponse.json({ success: true, quote: newQuote });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 });
    }
    console.error("[API Quotes POST] Error:", error);
    return NextResponse.json({ error: "Error al crear presupuesto" }, { status: 500 });
  }
}
