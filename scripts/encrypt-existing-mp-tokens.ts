/**
 * Script idempotente para cifrar tokens de Mercado Pago existentes en texto plano.
 *
 * Modos de ejecución:
 *   1. Simulación (dry-run por defecto):
 *      npx tsx scripts/encrypt-existing-mp-tokens.ts
 *   2. Ejecución real (requiere --yes):
 *      npx tsx scripts/encrypt-existing-mp-tokens.ts --yes
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import {
  ENCRYPTION_PREFIX,
  encryptSecretWithMasterKey,
} from "../src/lib/crypto-core";

const prisma = new PrismaClient();

function getScriptMasterKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY?.trim();
  if (envKey) {
    if (!/^[0-9a-fA-F]{64}$/.test(envKey)) {
      throw new Error(
        "[EncryptTokens] ENCRYPTION_KEY inválida: debe tener exactamente 64 caracteres hexadecimales (32 bytes)."
      );
    }
    return Buffer.from(envKey, "hex");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[EncryptTokens] En producción, ENCRYPTION_KEY (64 hex) es estrictamente obligatoria."
    );
  }

  const fallbackKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!fallbackKey) {
    throw new Error(
      "[EncryptTokens] Debe definir ENCRYPTION_KEY o SUPABASE_SERVICE_ROLE_KEY en el archivo de entorno."
    );
  }

  console.warn(
    "[EncryptTokens] AVISO: ENCRYPTION_KEY no definida; derivando clave desde SUPABASE_SERVICE_ROLE_KEY."
  );
  return crypto.createHash("sha256").update(fallbackKey).digest();
}

async function main() {
  const hasYesFlag = process.argv.includes("--yes");
  const isDryRun = !hasYesFlag;
  const masterKey = getScriptMasterKey();

  console.log(
    `[EncryptTokens] Iniciando escaneo de organizaciones (${isDryRun ? "MODO SIMULACIÓN (DRY-RUN)" : "MODO REAL (--yes)"})...`
  );

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      mpAccessToken: true,
      mpWebhookSecret: true,
    },
  });

  let tokensToEncryptCount = 0;
  let secretsToEncryptCount = 0;

  for (const org of organizations) {
    const rawToken = org.mpAccessToken?.trim();
    const rawSecret = org.mpWebhookSecret?.trim();

    const needsTokenEncryption = Boolean(rawToken && !rawToken.startsWith(ENCRYPTION_PREFIX));
    const needsSecretEncryption = Boolean(rawSecret && !rawSecret.startsWith(ENCRYPTION_PREFIX));

    if (!needsTokenEncryption && !needsSecretEncryption) {
      continue;
    }

    if (needsTokenEncryption) tokensToEncryptCount++;
    if (needsSecretEncryption) secretsToEncryptCount++;

    console.log(
      `[EncryptTokens] Org: "${org.name}" (id: ${org.id}) -> ` +
        `mpAccessToken: ${needsTokenEncryption ? "TEXTO PLANO (A CIFRAR)" : "OK"}, ` +
        `mpWebhookSecret: ${needsSecretEncryption ? "TEXTO PLANO (A CIFRAR)" : "OK"}`
    );

    if (!isDryRun) {
      const updateData: { mpAccessToken?: string; mpWebhookSecret?: string } = {};
      if (needsTokenEncryption && rawToken) {
        updateData.mpAccessToken = encryptSecretWithMasterKey(rawToken, masterKey);
      }
      if (needsSecretEncryption && rawSecret) {
        updateData.mpWebhookSecret = encryptSecretWithMasterKey(rawSecret, masterKey);
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: updateData,
      });

      console.log(`[EncryptTokens] -> Cifrado guardado en base de datos.`);
    }
  }

  console.log("\n================ RESUMEN ================");
  console.log(`Organizaciones analizadas: ${organizations.length}`);
  console.log(`mpAccessToken en texto plano encontrados: ${tokensToEncryptCount}`);
  console.log(`mpWebhookSecret en texto plano encontrados: ${secretsToEncryptCount}`);

  if (isDryRun && (tokensToEncryptCount > 0 || secretsToEncryptCount > 0)) {
    console.log(
      "\nPara aplicar el cifrado en la base de datos, vuelva a ejecutar con el flag --yes:"
    );
    console.log("npx tsx scripts/encrypt-existing-mp-tokens.ts --yes");
  } else if (!isDryRun) {
    console.log("\n¡Todos los tokens y secretos quedaron cifrados con AES-256-GCM!");
  } else {
    console.log("\nTodos los tokens ya estaban cifrados o vacíos. Nada que hacer.");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("[EncryptTokens] Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
