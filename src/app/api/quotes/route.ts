import { NextRequest, NextResponse } from "next/server";
import { getQuotes, createQuote, getOrganization } from "@/lib/services";
import { quoteCreateSchema } from "@/lib/types";

export async function GET() {
  try {
    const quotes = await getQuotes();
    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = quoteCreateSchema.parse(body);

    const org = await getOrganization();
    const newQuote = await createQuote(org.id, validated);

    return NextResponse.json({ success: true, quote: newQuote });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
