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
import { encryptSecret } from "../src/lib/crypto";

const prisma = new PrismaClient();

const ENCRYPTION_PREFIX = "enc:v1:";

async function main() {
  const hasYesFlag = process.argv.includes("--yes");
  const isDryRun = !hasYesFlag;

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
        updateData.mpAccessToken = encryptSecret(rawToken);
      }
      if (needsSecretEncryption && rawSecret) {
        updateData.mpWebhookSecret = encryptSecret(rawSecret);
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

