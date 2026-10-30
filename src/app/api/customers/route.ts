import { NextRequest, NextResponse } from "next/server";
import { getCustomers, createCustomer, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { customerSchema } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    let orgId: string | undefined;

    // 1. Probar sesión de auth local / JWT
    const session = await getSession();
    if (session?.organizationId) {
      orgId = session.organizationId;
    } else {
      // 2. Probar sesión de Supabase Auth
      try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          orgId = (user.user_metadata as any)?.organizationId;
        }
      } catch {}
    }

    const customers = await getCustomers(orgId);
    return NextResponse.json(customers);
  } catch (error: any) {
    console.error("[API Customers GET] Error:", error);
    const msg = error?.message || String(error);
    if (msg.includes("42501") || msg.includes("row-level security") || msg.includes("RLS")) {
      return NextResponse.json(
        { error: "Error de políticas RLS en Supabase: no se tienen permisos de lectura para 'customers'." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = customerSchema.parse(body);

    let orgId: string | undefined;

    const session = await getSession();
    if (session?.organizationId) {
      orgId = session.organizationId;
    } else {
      try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          orgId = (user.user_metadata as any)?.organizationId;
        }
      } catch {}
    }

    const org = await getOrganization(orgId);
    const newCustomer = await createCustomer(org.id, validated);

    if (!newCustomer) {
      throw new Error("No se pudo persistir el comitente en la base de datos.");
    }

    return NextResponse.json({ success: true, customer: newCustomer }, { status: 201 });
  } catch (error: unknown) {
    console.error("[API Customers POST] Error:", error);
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Datos inválidos", issues: (error as any).issues }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("42501") || msg.includes("row-level security") || msg.includes("RLS")) {
      return NextResponse.json(
        { error: "Error de políticas RLS en Supabase: no se tienen permisos de inserción en 'customers'." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
