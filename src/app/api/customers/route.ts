import { NextRequest, NextResponse } from "next/server";
import { getCustomers, createCustomer } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { customerSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const customers = await getCustomers(session.organizationId);
    return NextResponse.json(customers, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error: unknown) {
    console.error("[API Customers GET] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener clientes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const validated = customerSchema.parse(body);

    const newCustomer = await createCustomer(session.organizationId, validated);

    return NextResponse.json({ success: true, customer: newCustomer }, { status: 201 });
  } catch (error: unknown) {
    console.error("[API Customers POST] Error:", error);
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { error: "Datos inválidos", issues: (error as any).issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear cliente" },
      { status: 500 }
    );
  }
}
