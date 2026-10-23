import { NextRequest, NextResponse } from "next/server";
import { updateJobStatus } from "@/lib/services";

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updatedJob = await updateJobStatus(id, status);
    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Error al actualizar estado del trabajo", details: String(error) },
      { status: 500 }
    );
  }
}
