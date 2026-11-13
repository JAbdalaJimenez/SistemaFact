import { after } from "next/server";
import prisma from "./db";

/**
 * Registra una descarga de presupuesto SIN bloquear la respuesta HTTP.
 * Usa `after()` de Next.js: se ejecuta tras enviar la respuesta y, en Vercel,
 * el runtime espera a que termine (a diferencia de una promesa suelta, que puede cortarse).
 * Cualquier error se absorbe: un fallo de analítica nunca debe romper la descarga.
 */
export function trackQuoteExport(params: {
  organizationId: string;
  quoteId: string;
  format: "PDF" | "DOCX";
}): void {
  try {
    after(async () => {
      try {
        await prisma.exportEvent.create({
          data: {
            organizationId: params.organizationId,
            quoteId: params.quoteId,
            format: params.format,
          },
        });
      } catch (error) {
        console.error("[export-tracking] No se pudo registrar la descarga:", error instanceof Error ? error.message : error);
      }
    });
  } catch (error) {
    console.error("[export-tracking] after() no disponible:", error instanceof Error ? error.message : error);
  }
}
