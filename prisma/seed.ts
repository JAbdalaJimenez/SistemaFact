import "dotenv/config";
import { PrismaClient, UserRole, QuoteItemType } from "@prisma/client";
import { createClient, User as SupabaseAuthUser } from "@supabase/supabase-js";

const prisma = new PrismaClient();

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
      throw new Error(`Error al consultar usuarios en Supabase Auth (página ${page}): ${error.message}`);
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

export async function seedDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[SEED] BLOQUEADO: No está permitido ejecutar el seed destructivo cuando NODE_ENV === 'production'."
    );
  }

  if (process.env.ALLOW_SEED_WIPE !== "true") {
    throw new Error(
      "[SEED] BLOQUEADO: Este script elimina todos los registros de la base de datos. Defina ALLOW_SEED_WIPE=true explícitamente para ejecutarlo en entorno de desarrollo."
    );
  }

  console.log("[SEED] Inicializando datos base de desarrollo para ElectroCba...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const seedPassword = process.env.SEED_SUPERADMIN_PASSWORD;
  const seedEmail = (process.env.SEED_SUPERADMIN_EMAIL || "admin@electrocba.com.ar")
    .toLowerCase()
    .trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Debe definir NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para ejecutar el seed."
    );
  }

  if (!seedPassword || seedPassword.length < 8) {
    throw new Error(
      "Debe definir SEED_SUPERADMIN_PASSWORD (mínimo 8 caracteres) en el entorno para ejecutar el seed."
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Limpieza inicial de tablas (solo permitida en desarrollo con ALLOW_SEED_WIPE=true)
  await prisma.payment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.service.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Crear o recuperar el Superadmin en Supabase Auth (paginando todas las páginas, sin pisar contraseña si ya existe)
  const allAuthUsers = await fetchAllAuthUsers(supabaseAdmin);
  const existingAuthUser = allAuthUsers.find(
    (u) => u.email?.toLowerCase() === seedEmail
  );

  let authUserId: string;

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
    console.log(
      `[SEED] Usuario Auth ya existente (${seedEmail}, id=${authUserId}). Se vincula sin modificar su contraseña.`
    );
  } else {
    const { data: createdAuth, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: seedEmail,
        password: seedPassword,
        email_confirm: true,
      });

    if (createErr || !createdAuth.user) {
      throw new Error(
        `Error al crear Superadmin en Supabase Auth: ${createErr?.message || "desconocido"}`
      );
    }
    authUserId = createdAuth.user.id;
    console.log(`[SEED] Usuario Superadmin creado en Supabase Auth (${seedEmail}).`);
  }

  // 3. Organización Base del Instalador Profesional
  const org = await prisma.organization.create({
    data: {
      name: "ElectroCba - Soluciones Eléctricas",
      slug: "electrocba",
      legalName: "Instalador Electricista Habilitado",
      ersepLicenseNumber: "Habilitación ERSeP Ley 10.281",
      ersepLicense: "Habilitación ERSeP Ley 10.281",
      cuit: "20-00000000-0",
      vatCondition: "Monotributo",
      taxCondition: "Monotributo - Prestador de Servicios Técnicos",
      legalAddress: "Córdoba Capital, Provincia de Córdoba",
      address: "Córdoba Capital, Provincia de Córdoba",
      phone: "+54 9 351 000-0000",
      whatsappNumber: "+5493510000000",
      bankAlias: "ELECTROCBA.MP",
      cbuCvu: "0000003100010000000000",
      aliasCbu: "ELECTROCBA.MP",
      currency: "ARS",
    },
  });

  // 4. Usuario Superadmin vinculado por authUserId en Prisma
  await prisma.user.create({
    data: {
      authUserId,
      organizationId: org.id,
      name: "Super Administrador",
      email: seedEmail,
      role: UserRole.SUPERADMIN,
      phone: "+5493510000000",
    },
  });

  // 5. Catálogo de Servicios Normativos AEA 90364 e IRAM
  await Promise.all([
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Mano de Obra: Adecuación y Montaje de Tablero Seccional",
        description:
          "Montaje sobre riel DIN, conexionado de protecciones y ensayo de disparo bajo norma AEA 90364",
        defaultPrice: 65000,
        type: QuoteItemType.LABOR,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Provisión: Disyuntor Diferencial 2x40A 30mA (IRAM 2164) y Térmicas",
        description:
          "Dispositivo bipolar diferencial con certificación IRAM vigente y llaves termomagnéticas",
        defaultPrice: 85000,
        type: QuoteItemType.MATERIALS,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Mano de Obra: Puesta a Tierra Integral y Medición de Protocolo",
        description:
          "Hincado de jabalina, morceto de bronce forjado, medición de resistencia y emisión protocolo ERSeP Ley 10.281",
        defaultPrice: 60000,
        type: QuoteItemType.LABOR,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Provisión: Kit Jabalina Acero-Cobre IRAM 2309 (1.5m) + Cámara PVC",
        description:
          "Jabalina de acero-cobre normalizada IRAM 2309, cámara de inspección PVC reforzada y morceto",
        defaultPrice: 42000,
        type: QuoteItemType.MATERIALS,
      },
    }),
  ]);

  console.log("[SEED] Entorno local de desarrollo inicializado y vinculado con Supabase Auth.");
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
