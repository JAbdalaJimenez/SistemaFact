import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Diagnóstico de conexión a la base de datos (no expone la contraseña).
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL || "";
  let host = "NO CONFIGURADA";
  let port = "";
  try {
    if (rawUrl) {
      const parsed = new URL(rawUrl);
      host = parsed.hostname;
      port = parsed.port;
    }
  } catch {
    host = "URL MAL FORMADA (revisar comillas o corchetes)";
  }

  try {
    const [customers, quotes] = await Promise.all([
      prisma.customer.count(),
      prisma.quote.count(),
    ]);
    return NextResponse.json({
      database: "CONECTADA",
      host,
      port,
      customers,
      quotes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        database: "ERROR DE CONEXION",
        host,
        port,
        error: error instanceof Error ? error.message.slice(0, 300) : String(error),
      },
      { status: 500 }
    );
  }
}
