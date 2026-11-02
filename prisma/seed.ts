import { PrismaClient, UserRole, QuoteItemType } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log("[SEED] Inicializando datos base limpios para ElectroCba...");

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

  // 1. Limpieza inicial de tablas
  try {
    await prisma.payment.deleteMany();
    await prisma.job.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.service.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
  } catch {
    console.log("Limpieza omitida o base de datos inicial.");
  }

  // 2. Crear o recuperar el Superadmin en Supabase Auth
  let authUserId: string | undefined;

  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Error al consultar usuarios en Supabase Auth: ${listError.message}`);
  }

  const existingAuthUser = listData.users.find(
    (u) => u.email?.toLowerCase() === seedEmail
  );

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: seedPassword,
      email_confirm: true,
    });
    if (updateErr) {
      throw new Error(`Error al actualizar contraseña de Superadmin en Auth: ${updateErr.message}`);
    }
    console.log(`[SEED] Usuario Auth existente vinculado (${seedEmail}).`);
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

  console.log("[SEED] Base de datos inicializada y vinculada con Supabase Auth.");
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
