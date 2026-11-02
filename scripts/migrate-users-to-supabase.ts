/**
 * Script idempotente para migrar y vincular usuarios existentes en Prisma (public.users)
 * hacia Supabase Auth (auth.users) mediante `authUserId`.
 *
 * Uso:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-users-to-supabase.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-users-to-supabase.ts
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const sendResetEmail = process.argv.includes("--send-reset");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Error al listar usuarios de Supabase Auth: ${listError.message}`);
  }

  const authByEmail = new Map<string, string>();
  for (const au of authList.users) {
    if (au.email) {
      authByEmail.set(au.email.toLowerCase().trim(), au.id);
    }
  }

  const usersRequiringPasswordReset: string[] = [];

  for (const user of pendingUsers) {
    const normalizedEmail = user.email.toLowerCase().trim();
    const existingAuthId = authByEmail.get(normalizedEmail);

    if (isDryRun) {
      if (existingAuthId) {
        console.log(
          `[DRY-RUN] Vincularía User(${user.id}, ${normalizedEmail}) con auth.users existente (${existingAuthId})`
        );
      } else {
        console.log(
          `[DRY-RUN] Crearía nuevo usuario en auth.users para User(${user.id}, ${normalizedEmail}) y asignaría authUserId`
        );
      }
      continue;
    }

    let targetAuthId = existingAuthId;

    if (!targetAuthId) {
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

      targetAuthId = created.user.id;
      usersRequiringPasswordReset.push(normalizedEmail);

      if (sendResetEmail) {
        await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        authUserId: targetAuthId,
        password: null,
      },
    });

    console.log(
      `[MigrateUsers] Vinculado User(${user.id}, ${normalizedEmail}) -> authUserId=${targetAuthId}`
    );
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

