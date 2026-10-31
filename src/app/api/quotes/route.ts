import { NextRequest, NextResponse } from "next/server";
import { getQuotes, createQuote, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { quoteCreateSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    const orgId = session?.organizationId;
    const quotes = await getQuotes(orgId);
    return NextResponse.json(quotes, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = quoteCreateSchema.parse(body);

    const session = await getSession();
    const org = await getOrganization(session?.organizationId);
    const newQuote = await createQuote(org.id, validated);

    return NextResponse.json({ success: true, quote: newQuote });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
