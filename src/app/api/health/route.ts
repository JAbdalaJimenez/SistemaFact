import { NextResponse } from "next/server";
import prisma, { cleanDatabaseUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Diagnóstico de conexión a la base de datos (no expone la contraseña).
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL || "";
  const cleanedUrl = cleanDatabaseUrl(rawUrl);

  // Diagnóstico del valor crudo sin exponer credenciales
  const rawDiagnostics = {
    configured: rawUrl.length > 0,
    length: rawUrl.length,
    startsWith: rawUrl.slice(0, 13),
    hasQuotes: /["'`]/.test(rawUrl),
    hasBrackets: /[\[\]]/.test(rawUrl),
    hasSpaces: /\s/.test(rawUrl),
  };

  let host = "NO CONFIGURADA";
  let port = "";
  try {
    if (cleanedUrl) {
      const parsed = new URL(cleanedUrl);
      host = parsed.hostname;
      port = parsed.port;
    }
  } catch {
    host = "URL MAL FORMADA";
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
      rawDiagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        database: "ERROR DE CONEXION",
        host,
        port,
        rawDiagnostics,
        error: error instanceof Error ? error.message.slice(0, 300) : String(error),
      },
      { status: 500 }
    );
  }
}
