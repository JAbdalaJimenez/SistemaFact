import { NextRequest, NextResponse } from "next/server";
import { getCustomers, createCustomer, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { customerSchema } from "@/lib/types";

export async function GET() {
  try {
    const session = await getSession();
    const orgId = session?.organizationId;
    const customers = await getCustomers(orgId);
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = customerSchema.parse(body);

    const session = await getSession();
    const org = await getOrganization(session?.organizationId);
    const newCustomer = await createCustomer(org.id, validated);

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
