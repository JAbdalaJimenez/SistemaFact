import { PrismaClient, UserRole, QuoteStatus, JobStatus, PaymentMethod, PaymentStatus, QuoteItemType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log("[SEED] Iniciando seed ampliado de datos para ElectroCba (Córdoba, Argentina)...");

  // 1. Limpiar datos previos si existen
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
    console.log("ℹ️ Limpieza inicial omitida o tablas nuevas.");
  }

  // 2. Crear Organización Principal con datos fiscales y bancarios
  const org = await prisma.organization.create({
    data: {
      id: "org_electrocba_cba01",
      name: "ElectroCba - Soluciones Eléctricas",
      slug: "electrocba",
      phone: "+5493515123456",
      email: "contacto@electrocba.com.ar",
      currency: "ARS",
      ersepLicense: "ERSeP Cat. III - N° 14892",
      cuit: "20-33445566-9",
      taxCondition: "Monotributo - Prestador de Servicios Técnicos",
      aliasCbu: "ELECTROCBA.MP",
      address: "Av. Colón 1450, B° Alberdi, Córdoba Capital",
    },
  });

  // Hash de contraseñas de demostración
  const ownerPasswordHash = bcrypt.hashSync("electrocba2026", 10);
  const memberPasswordHash = bcrypt.hashSync("tecnico2026", 10);

  // 3. Crear Usuarios (OWNER y MEMBER)
  await prisma.user.create({
    data: {
      id: "user_marcos_cba",
      organizationId: org.id,
      name: "Marcos Romero",
      email: "marcos@electrocba.com.ar",
      password: ownerPasswordHash,
      role: UserRole.OWNER,
      phone: "+5493515123456",
    },
  });

  await prisma.user.create({
    data: {
      id: "user_nicolas_cba",
      organizationId: org.id,
      name: "Nicolás Gómez",
      email: "tecnico@electrocba.com.ar",
      password: memberPasswordHash,
      role: UserRole.MEMBER,
      phone: "+5493517788990",
    },
  });

  // 4. Crear Clientes Ficticios Cordobeses
  const customerCamila = await prisma.customer.create({
    data: {
      id: "cust_camila_01",
      organizationId: org.id,
      name: "Camila Ferrero",
      phone: "+5493516887722",
      address: "San Lorenzo 420, Dpto 7B",
      neighborhood: "Nueva Córdoba",
      notes: "Edificio Torre Bellini. Portero 72. Avisar antes de ir por temas de consorcio.",
    },
  });

  const customerGonzalo = await prisma.customer.create({
    data: {
      id: "cust_gonzalo_02",
      organizationId: org.id,
      name: "Gonzalo Bertorello",
      phone: "+5493513445566",
      address: "24 de Septiembre 950",
      neighborhood: "General Paz",
      notes: "Restó gastronómico 'La Cañada Grill'. Trabajos coordinar de 8:00 a 11:30 hs.",
    },
  });

  const customerLucia = await prisma.customer.create({
    data: {
      id: "cust_lucia_03",
      organizationId: org.id,
      name: "Lucía Varela",
      phone: "+5493517112233",
      address: "Mariano Fragueiro 2130",
      neighborhood: "Alta Córdoba",
      notes: "Casa antigua con instalación de tela para recablear. Tiene perros en el patio delantero.",
    },
  });

  // 5. Catálogo de Servicios con discriminación de Tipo
  await Promise.all([
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Mano de Obra: Instalación de Disyuntor Diferencial",
        description: "Montaje sobre riel DIN y ensayo de disparo bajo norma AEA 90364",
        defaultPrice: 35000,
        type: QuoteItemType.LABOR,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Provisión: Disyuntor Schneider Acti9 2x40A 30mA (IRAM 2164)",
        description: "Dispositivo bipolar diferencial con certificación IRAM vigente",
        defaultPrice: 45000,
        type: QuoteItemType.MATERIALS,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Mano de Obra: Puesta a Tierra y Protocolo ERSeP",
        description: "Hincado, conexionado de jabalina, medición de resistencia y emisión certificado",
        defaultPrice: 55000,
        type: QuoteItemType.LABOR,
      },
    }),
    prisma.service.create({
      data: {
        organizationId: org.id,
        title: "Provisión: Kit Jabalina Cobre 1.5m + Caja de Inspección + Morceto",
        description: "Jabalina de acero-cobre normalizada IRAM 2309 y cámara de inspección PVC",
        defaultPrice: 40000,
        type: QuoteItemType.MATERIALS,
      },
    }),
  ]);

  // Cláusulas Legales Cordobesas Estándar
  const standardLegalClauses = `1. MARCO NORMATIVO: Tareas ejecutadas bajo la Ley de Seguridad Eléctrica de la Provincia de Córdoba N° 10.281 y reglamentación AEA 90364.
2. GARANTÍA LEGAL ESCRITA: Conforme a la Ley Nacional de Defensa del Consumidor N° 24.240 (Arts. 11 y 21), se otorga garantía escrita por seis (6) meses sobre la mano de obra y componentes instalados.
3. CONDICIÓN ANTI-INFLACIÓN Y VIGENCIA: Precios firmes por 10 días corridos desde la emisión. Ajustes posteriores aplicarán exclusivamente si la lista oficial de distribuidoras de materiales supera el 10% de variación.
4. CONDICIONES DE PAGO: Seña del 50% para reserva de fecha y acopio de materiales. Saldo del 50% restante contra recepción y conformidad de obra.
5. MEDIOS HABILITADOS: Transferencia (Alias: ELECTROCBA.MP), Mercado Pago (tarjetas/dinero en cuenta) o Efectivo con recibo fiscal.`;

  // 6. Presupuestos con discriminación de Mano de Obra vs. Materiales
  // Presupuesto 1: Camila (Aprobado y en ejecución)
  const quoteCamila = await prisma.quote.create({
    data: {
      id: "quote_camila_01",
      organizationId: org.id,
      customerId: customerCamila.id,
      publicToken: "cba-presupuesto-camila-01",
      quoteNumber: "EC-2026-0042",
      title: "Renovación Tablero Eléctrico y Certificación ERSeP",
      status: QuoteStatus.APPROVED,
      depositPercentage: 50,
      validityDays: 10,
      totalAmount: 210000,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      notes: standardLegalClauses,
      items: {
        create: [
          {
            description: "Mano de obra: Desmontaje de llaves antiguas, peinado y conexionado de riel DIN",
            itemType: QuoteItemType.LABOR,
            quantity: 1,
            unitPrice: 50000,
            subtotal: 50000,
          },
          {
            description: "Mano de obra: Instalación de jabalina, medición de resistencia y protocolo oficial ERSeP",
            itemType: QuoteItemType.LABOR,
            quantity: 1,
            unitPrice: 55000,
            subtotal: 55000,
          },
          {
            description: "Provisión: Disyuntor Diferencial Schneider 2x40A 30mA + 3 Térmicas Sica Bipolares (IRAM)",
            itemType: QuoteItemType.MATERIALS,
            quantity: 1,
            unitPrice: 65000,
            subtotal: 65000,
          },
          {
            description: "Provisión: Jabalina 1.5m cobre 5/8, caja de inspección PVC y morceto de bronce",
            itemType: QuoteItemType.MATERIALS,
            quantity: 1,
            unitPrice: 40000,
            subtotal: 40000,
          },
        ],
      },
    },
  });

  // Presupuesto 2: Gonzalo (Enviado, pendiente de confirmación)
  await prisma.quote.create({
    data: {
      id: "quote_gonzalo_02",
      organizationId: org.id,
      customerId: customerGonzalo.id,
      publicToken: "cba-presupuesto-gonzalo-02",
      quoteNumber: "EC-2026-0043",
      title: "Adecuación Trifásica para Horno Industrial y Cámaras",
      status: QuoteStatus.SENT,
      depositPercentage: 50,
      validityDays: 10,
      totalAmount: 490000,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: standardLegalClauses,
      items: {
        create: [
          {
            description: "Mano de obra: Tendido subterráneo en caño rígido y conexionado tablero seccional gastronómico",
            itemType: QuoteItemType.LABOR,
            quantity: 1,
            unitPrice: 165000,
            subtotal: 165000,
          },
          {
            description: "Provisión: Cable subterráneo Sintenax 4x6mm² cobre normalizado IRAM 2178 (25 mts)",
            itemType: QuoteItemType.MATERIALS,
            quantity: 1,
            unitPrice: 185000,
            subtotal: 185000,
          },
          {
            description: "Provisión: Guardamotor trifásico regulable 16-24A y contactor de potencia Schneider",
            itemType: QuoteItemType.MATERIALS,
            quantity: 1,
            unitPrice: 140000,
            subtotal: 140000,
          },
        ],
      },
    },
  });

  // Presupuesto 3: Lucía (Borrador)
  await prisma.quote.create({
    data: {
      id: "quote_lucia_03",
      organizationId: org.id,
      customerId: customerLucia.id,
      publicToken: "cba-presupuesto-lucia-03",
      quoteNumber: "EC-2026-0044",
      title: "Recableado Completo de Iluminación y Tomacorrientes",
      status: QuoteStatus.DRAFT,
      depositPercentage: 50,
      validityDays: 15,
      totalAmount: 404000,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      notes: standardLegalClauses,
      items: {
        create: [
          {
            description: "Mano de obra: Retiro de cables antiguos de tela y pasaje por cañería existente (18 bocas)",
            itemType: QuoteItemType.LABOR,
            quantity: 18,
            unitPrice: 18000,
            subtotal: 324000,
          },
          {
            description: "Provisión: 10 módulos armados de punto y toma línea Jeluz Platino (Norma IRAM)",
            itemType: QuoteItemType.MATERIALS,
            quantity: 10,
            unitPrice: 8000,
            subtotal: 80000,
          },
        ],
      },
    },
  });

  // 7. Órdenes de Trabajo (Jobs)
  const jobCamila = await prisma.job.create({
    data: {
      id: "job_camila_01",
      organizationId: org.id,
      customerId: customerCamila.id,
      quoteId: quoteCamila.id,
      title: "Renovación Tablero Eléctrico y Certificación ERSeP",
      status: JobStatus.IN_PROGRESS,
      totalAmount: 210000,
      balanceDue: 105000,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: "Materiales acopiados. Llevar taladro percutor y mechas para hormigón.",
    },
  });

  await prisma.payment.create({
    data: {
      id: "pay_camila_01",
      organizationId: org.id,
      jobId: jobCamila.id,
      amount: 105000,
      paymentMethod: PaymentMethod.MERCADO_PAGO,
      status: PaymentStatus.APPROVED,
      mpPaymentId: "mp_pay_984321774",
      notes: "Seña 50% abonada online vía Mercado Pago Checkout",
    },
  });

  const jobGonzalo = await prisma.job.create({
    data: {
      id: "job_gonzalo_02",
      organizationId: org.id,
      customerId: customerGonzalo.id,
      title: "Urgencia Cortocircuito en Tablero Principal",
      status: JobStatus.COMPLETED,
      totalAmount: 95000,
      balanceDue: 0,
      scheduledDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      notes: "Se cambió térmica fundida y se aisló empalme en bandeja.",
    },
  });

  await prisma.payment.create({
    data: {
      id: "pay_gonzalo_02",
      organizationId: org.id,
      jobId: jobGonzalo.id,
      amount: 95000,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.APPROVED,
      notes: "Pago contado efectivo entregado al finalizar el servicio con recibo provisorio.",
    },
  });

  await prisma.job.create({
    data: {
      id: "job_lucia_03",
      organizationId: org.id,
      customerId: customerLucia.id,
      title: "Visita Técnica y Relevamiento de Cañerías",
      status: JobStatus.SCHEDULED,
      totalAmount: 35000,
      balanceDue: 35000,
      scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      notes: "Llevar pasacables metálico y tester de aislación.",
    },
  });

  console.log("[OK] Seed completado con exito.");
  console.log(`[ORG] Organizacion: ${org.name} (${org.taxCondition})`);
  console.log(`[AUTH] Usuario OWNER: marcos@electrocba.com.ar / electrocba2026`);
  console.log(`[AUTH] Usuario MEMBER: tecnico@electrocba.com.ar / tecnico2026`);
  console.log(`[EXP] Presupuestos formales con discriminacion Mano de Obra / Materiales IRAM y Clausulas Legales.`);
}

if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  seedDatabase()
    .catch((e) => {
      console.error("[ERROR] Error en seed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
