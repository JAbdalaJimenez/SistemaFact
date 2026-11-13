import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    // Solo se loguea en el servidor (Vercel Logs); la respuesta pública sigue siendo genérica.
    console.error("[health] Falló la consulta a la DB:", error instanceof Error ? error.message : error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
