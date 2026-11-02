/**
 * Script idempotente para migrar y vincular usuarios existentes en Prisma (public.users)
 * hacia Supabase Auth (auth.users) mediante `authUserId`.
 *
 * Modos de ejecución (con `npx tsx`):
 *   1. Simulación sin cambios:
 *      npx tsx scripts/migrate-users-to-supabase.ts --dry-run
 *   2. Ejecución real (requiere --yes, conserva el hash en `password`):
 *      npx tsx scripts/migrate-users-to-supabase.ts --yes
 *   3. Limpieza final de hashes legados (solo usuarios ya vinculados con authUserId):
 *      npx tsx scripts/migrate-users-to-supabase.ts --finalize --yes
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createClient, User as SupabaseAuthUser } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function extractSafeDbHost(rawUrl: string | undefined): string {
  if (!rawUrl) return "(DATABASE_URL no definida)";
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    return "(formato de DATABASE_URL inválido)";
  }
}

async function fetchAllAuthUsers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any
): Promise<SupabaseAuthUser[]> {
  const allUsers: SupabaseAuthUser[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Error al listar usuarios de Supabase Auth (página ${page}): ${error.message}`);
    }

    const batch: SupabaseAuthUser[] = data?.users ?? [];
    allUsers.push(...batch);

    if (batch.length < perPage) {
      break;
    }
    page += 1;
  }

  return allUsers;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const isFinalize = process.argv.includes("--finalize");
  const hasYesFlag = process.argv.includes("--yes");
  const sendResetEmail = process.argv.includes("--send-reset");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbHost = extractSafeDbHost(process.env.DATABASE_URL);

  console.log(`[MigrateUsers] Host de base de datos objetivo: ${dbHost}`);

  if (!isDryRun && !hasYesFlag) {
    console.error(
      "[MigrateUsers] ABORTADO: Para ejecutar cambios reales sobre la base de datos debe pasar el flag explícito --yes (o usar --dry-run para simular)."
    );
    process.exit(1);
  }

  // Modo --finalize: limpia los hashes de `password` únicamente en usuarios que ya tienen `authUserId`
  if (isFinalize) {
    const linkedWithPasswordCount = await prisma.user.count({
      where: {
        authUserId: { not: null },
        password: { not: null },
      },
    });

    if (isDryRun) {
      console.log(
        `[DRY-RUN][--finalize] Se borraría el campo password (NULL) en ${linkedWithPasswordCount} usuarios ya vinculados con authUserId.`
      );
      return;
    }

    const updated = await prisma.user.updateMany({
      where: {
        authUserId: { not: null },
        password: { not: null },
      },
      data: {
        password: null,
      },
    });

    console.log(
      `[MigrateUsers][--finalize] Se limpió el campo password en ${updated.count} usuarios vinculados.`
    );
    return;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(
    `[MigrateUsers] Iniciando migración a Supabase Auth (${isDryRun ? "DRY-RUN" : "EJECUCIÓN REAL"})...`
  );

  const pendingUsers = await prisma.user.findMany({
    where: { authUserId: null },
    orderBy: { createdAt: "asc" },
  });

  if (pendingUsers.length === 0) {
    console.log("[MigrateUsers] Todos los usuarios ya tienen authUserId vinculado. Nada que hacer.");
    return;
  }

  console.log(`[MigrateUsers] Usuarios sin authUserId encontrados: ${pendingUsers.length}`);

  const allAuthUsers = await fetchAllAuthUsers(supabaseAdmin);
  const authByEmail = new Map<string, SupabaseAuthUser>();
  for (const au of allAuthUsers) {
    if (au.email) {
      authByEmail.set(au.email.toLowerCase().trim(), au);
    }
  }

  const usersRequiringPasswordReset: string[] = [];
  const manualReviewUsers: string[] = [];
  const skippedUnconfirmedUsers: string[] = [];

  for (const user of pendingUsers) {
    const normalizedEmail = user.email.toLowerCase().trim();
    const existingAuthUser = authByEmail.get(normalizedEmail);

    if (existingAuthUser) {
      if (!existingAuthUser.email_confirmed_at) {
        console.warn(
          `[MigrateUsers] SALTEADO — El email ${normalizedEmail} ya existe en auth.users (${existingAuthUser.id}) pero NO tiene email_confirmed_at. REVISAR MANUALMENTE.`
        );
        skippedUnconfirmedUsers.push(`${normalizedEmail} (authId=${existingAuthUser.id}, sin email_confirmed_at)`);
        continue;
      }

      manualReviewUsers.push(`${normalizedEmail} (userId=${user.id} -> authId=${existingAuthUser.id})`);

      if (isDryRun) {
        console.log(
          `[DRY-RUN] REVISAR MANUALMENTE: Vincularía User(${user.id}, ${normalizedEmail}) con auth.users confirmado (${existingAuthUser.id}) conservando password hash.`
        );
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          authUserId: existingAuthUser.id,
        },
      });

      console.log(
        `[MigrateUsers] Vinculado usuario existente confirmado (REVISAR MANUALMENTE): User(${user.id}, ${normalizedEmail}) -> authUserId=${existingAuthUser.id}`
      );
      continue;
    }

    if (isDryRun) {
      console.log(
        `[DRY-RUN] Crearía nuevo usuario en auth.users para User(${user.id}, ${normalizedEmail}) y asignaría authUserId (conservando password hash hasta --finalize).`
      );
      continue;
    }

    // Generar contraseña temporal criptográficamente segura (nunca se imprime en consola)
    const tempPassword = `${randomBytes(24).toString("base64url")}!A9a`;
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
      });

    if (createError || !created.user) {
      console.error(
        `[MigrateUsers] Error creando usuario en Auth para ${normalizedEmail}:`,
        createError?.message
      );
      continue;
    }

    const targetAuthId = created.user.id;
    usersRequiringPasswordReset.push(normalizedEmail);

    if (sendResetEmail) {
      await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail);
    }

    // No se borra `password` en este paso; usar --finalize luego de verificar la migración
    await prisma.user.update({
      where: { id: user.id },
      data: {
        authUserId: targetAuthId,
      },
    });

    console.log(
      `[MigrateUsers] Creado y vinculado User(${user.id}, ${normalizedEmail}) -> authUserId=${targetAuthId}`
    );
  }

  if (manualReviewUsers.length > 0) {
    console.log(
      `\n[MigrateUsers] REVISAR MANUALMENTE (usuarios preexistentes en auth.users con email_confirmed_at vinculados):`
    );
    for (const item of manualReviewUsers) {
      console.log(` - ${item}`);
    }
  }

  if (skippedUnconfirmedUsers.length > 0) {
    console.log(
      `\n[MigrateUsers] SALTEADOS — REVISAR MANUALMENTE (usuarios preexistentes en auth.users SIN email_confirmed_at, no fueron vinculados):`
    );
    for (const item of skippedUnconfirmedUsers) {
      console.log(` - ${item}`);
    }
  }

  if (usersRequiringPasswordReset.length > 0) {
    console.log(
      `\n[MigrateUsers] ATENCIÓN: Los siguientes usuarios fueron creados en Supabase Auth con contraseña temporal aleatoria y requieren restablecer su contraseña:`
    );
    for (const email of usersRequiringPasswordReset) {
      console.log(` - ${email}`);
    }
  }

  console.log("[MigrateUsers] Proceso finalizado.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[MigrateUsers] Error fatal:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
