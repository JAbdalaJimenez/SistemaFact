import { NextRequest, NextResponse } from "next/server";
import { recordPayment, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { manualPaymentSchema } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();

    const validated = manualPaymentSchema.parse({
      ...body,
      jobId: id,
    });

    const session = await getSession();
    const org = await getOrganization(session?.organizationId);
    const result = await recordPayment(org.id, validated);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("Error al registrar pago manual:", error);
    return NextResponse.json(
      { error: "Error al registrar pago", details: String(error) },
      { status: 400 }
    );
  }
}
