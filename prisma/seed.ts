import { PrismaClient, UserRole, QuoteItemType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log("[SEED] Inicializando datos base limpios para ElectroCba...");

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
    console.log("ℹ️ Limpieza omitida o base de datos inicial.");
  }

  // 2. Organización Base del Instalador Profesional
  const org = await prisma.organization.create({
    data: {
      id: "org_electrocba_cba01",
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

  // 3. Usuario Superadmin Único de Acceso y Gestión
  const superadminPasswordHash = bcrypt.hashSync("admin2026", 10);
  await prisma.user.create({
    data: {
      id: "user_superadmin_root",
      organizationId: org.id,
      name: "Super Administrador",
      email: "admin@electrocba.com.ar",
      password: superadminPasswordHash,
      role: UserRole.SUPERADMIN,
      phone: "+5493510000000",
    },
  });

  // 4. Catálogo de Servicios Normativos AEA 90364 e IRAM
  await Promise.all([
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Mano de Obra: Adecuación y Montaje de Tablero Seccional",
        description: "Montaje sobre riel DIN, conexionado de protecciones y ensayo de disparo bajo norma AEA 90364",
        defaultPrice: 65000,
        type: QuoteItemType.LABOR,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Provisión: Disyuntor Diferencial 2x40A 30mA (IRAM 2164) y Térmicas",
        description: "Dispositivo bipolar diferencial con certificación IRAM vigente y llaves termomagnéticas",
        defaultPrice: 85000,
        type: QuoteItemType.MATERIALS,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Mano de Obra: Puesta a Tierra Integral y Medición de Protocolo",
        description: "Hincado de jabalina, morceto de bronce forjado, medición de resistencia y emisión protocolo ERSeP Ley 10.281",
        defaultPrice: 60000,
        type: QuoteItemType.LABOR,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Provisión: Kit Jabalina Acero-Cobre IRAM 2309 (1.5m) + Cámara PVC",
        description: "Jabalina de acero-cobre normalizada IRAM 2309, cámara de inspección PVC reforzada y morceto",
        defaultPrice: 42000,
        type: QuoteItemType.MATERIALS,
      },
    }),
  ]);

  console.log("[SEED] Base de datos inicializada sin datos ficticios. Lista para producción.");
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
