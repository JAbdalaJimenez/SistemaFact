import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Limpia errores comunes al pegar DATABASE_URL en el panel de Vercel:
 * espacios, comillas, el prefijo "DATABASE_URL=" o corchetes alrededor de la contraseña.
 */
export function cleanDatabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let value = raw.trim();
  value = value.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  value = value.replace(/^["'`]+|["'`]+$/g, "").trim();
  value = value.replace(/:\[([^\]]+)\]@/, ":$1@");
  return value;
}

const databaseUrl = cleanDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
