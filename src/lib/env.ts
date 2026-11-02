import "server-only";
import { z } from "zod";
import { publicEnv } from "./env.public";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL es obligatoria")
    .refine(
      (val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
      "DATABASE_URL debe comenzar con postgresql:// o postgres://"
    ),
  DIRECT_URL: z
    .string()
    .min(1, "DIRECT_URL es obligatoria")
    .refine(
      (val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
      "DIRECT_URL debe comenzar con postgresql:// o postgres://"
    ),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY es obligatoria en el servidor"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional().default(""),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional().default(""),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional().default(""),
  ENCRYPTION_KEY: z.string().optional().default(""),
});

const parsedServer = serverEnvSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: publicEnv.NEXT_PUBLIC_APP_URL,
  MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  MERCADO_PAGO_PUBLIC_KEY: process.env.MERCADO_PAGO_PUBLIC_KEY,
  MERCADO_PAGO_WEBHOOK_SECRET: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
});

if (!parsedServer.success) {
  const details = parsedServer.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(
    `[Configuración Servidor] Variables de entorno inválidas o faltantes: ${details}`
  );
}

export const env = parsedServer.data;
export { publicEnv };

