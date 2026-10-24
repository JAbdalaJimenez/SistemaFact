import prisma from "./db";
import { CustomerFormData, QuoteCreateInput, ManualPaymentInput } from "./types";
import { randomUUID } from "crypto";

// Fallback Store en memoria para asegurar que la app funcione siempre
interface InMemQuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface InMemQuote {
  id: string;
  organizationId: string;
  customerId: string;
  publicToken: string;
  title: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CONVERTED";
  depositPercentage: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  items: InMemQuoteItem[];
}

interface InMemJob {
  id: string;
  organizationId: string;
  customerId: string;
  quoteId?: string;
  title: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  balanceDue: number;
  scheduledDate: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

interface InMemPayment {
  id: string;
  organizationId: string;
  jobId: string;
  amount: number;
  paymentMethod: "CASH" | "TRANSFER" | "MERCADO_PAGO";
  status: "PENDING" | "APPROVED" | "FAILED";
  mpPaymentId?: string;
  notes?: string;
  createdAt: string;
}

interface InMemCustomer {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  notes?: string;
  createdAt: string;
}

const DEFAULT_ORG_ID = "org_electrocba_cba01";

// Estado inicial en memoria fiel a Córdoba
const fallbackStore = {
  org: {
    id: DEFAULT_ORG_ID,
    name: "ElectroCba - Soluciones Eléctricas",
    slug: "electrocba",
    phone: "+5493515123456",
    email: "contacto@electrocba.com.ar",
    currency: "ARS",
    ersepLicense: "ERSeP Cat. III - N° 14892",
    cuit: "20-33445566-9",
    address: "Av. Colón 1450, B° Alberdi, Córdoba Capital",
  },
  customers: [
    {
      id: "cust_camila_01",
      organizationId: DEFAULT_ORG_ID,
      name: "Camila Ferrero",
      phone: "+5493516887722",
      address: "San Lorenzo 420, Dpto 7B",
      neighborhood: "Nueva Córdoba",
      notes: "Edificio Torre Bellini. Portero 72. Avisar antes de ir por temas de seguridad del edificio.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cust_gonzalo_02",
      organizationId: DEFAULT_ORG_ID,
      name: "Gonzalo Bertorello",
      phone: "+5493513445566",
      address: "24 de Septiembre 950",
      neighborhood: "General Paz",
      notes: "Restó gastronómico 'La Cañada Grill'. Trabajos coordinar de 8:00 a 11:30 hs.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cust_lucia_03",
      organizationId: DEFAULT_ORG_ID,
      name: "Lucía Varela",
      phone: "+5493517112233",
      address: "Mariano Fragueiro 2130",
      neighborhood: "Alta Córdoba",
      notes: "Casa antigua con instalación de tela para recablear. Tiene perros en el patio delantero.",
      createdAt: new Date().toISOString(),
    },
  ] as InMemCustomer[],
  services: [
    {
      id: "srv_01",
      organizationId: DEFAULT_ORG_ID,
      title: "Instalación de Disyuntor Diferencial 2x40A 30mA",
      description: "Colocación y calibrado en riel DIN con prueba de disparo",
      defaultPrice: 45000,
    },
    {
      id: "srv_02",
      organizationId: DEFAULT_ORG_ID,
      title: "Instalación de Jabalina + Protocolo ERSeP",
      description: "Hincado jabalina 1.5m cobre, caja de inspección y certificado firmado",
      defaultPrice: 95000,
    },
    {
      id: "srv_03",
      organizationId: DEFAULT_ORG_ID,
      title: "Recableado por Boca de Luz / Tomacorriente",
      description: "Reemplazo de conductores antiguos por cables IRAM 247-3 ignífugos",
      defaultPrice: 18000,
    },
    {
      id: "srv_04",
      organizationId: DEFAULT_ORG_ID,
      title: "Adecuación Tablero Seccional y Térmicas",
      description: "Reemplazo de llaves viejas, peines bipolares y balanceo",
      defaultPrice: 65000,
    },
  ],
  quotes: [
    {
      id: "quote_camila_01",
      organizationId: DEFAULT_ORG_ID,
      customerId: "cust_camila_01",
      publicToken: "cba-presupuesto-camila-01",
      title: "Renovación Tablero Eléctrico y Certificación ERSeP",
      status: "APPROVED" as const,
      depositPercentage: 50,
      totalAmount: 210000,
      notes: "Incluye materiales normalizados IRAM y certificación oficial ERSeP Cat. III para entrega a EPEC.",
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "qi_01",
          description: "Disyuntor Diferencial Schneider 40A 30mA + 3 Térmicas Sica Bipolares",
          quantity: 1,
          unitPrice: 80000,
          subtotal: 80000,
        },
        {
          id: "qi_02",
          description: "Puesta a tierra con jabalina 1.5m de cobre, morceto y caja de inspección",
          quantity: 1,
          unitPrice: 95000,
          subtotal: 95000,
        },
        {
          id: "qi_03",
          description: "Revisión integral de circuitos, aislación y protocolo de seguridad eléctrica",
          quantity: 1,
          unitPrice: 35000,
          subtotal: 35000,
        },
      ],
    },
    {
      id: "quote_gonzalo_02",
      organizationId: DEFAULT_ORG_ID,
      customerId: "cust_gonzalo_02",
      publicToken: "cba-presupuesto-gonzalo-02",
      title: "Adecuación Trifásica para Horno Industrial y Cámaras",
      status: "SENT" as const,
      depositPercentage: 50,
      totalAmount: 490000,
      notes: "Presupuesto válido por 7 días debido a cotización de conductores de cobre sintenax.",
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "qi_04",
          description: "Tendido de cable subterráneo 4x6mm² sintenax bajo caño rígido (25 mts)",
          quantity: 1,
          unitPrice: 185000,
          subtotal: 185000,
        },
        {
          id: "qi_05",
          description: "Guardamotor trifásico regulable 16-24A y contactor de protección",
          quantity: 1,
          unitPrice: 140000,
          subtotal: 140000,
        },
        {
          id: "qi_06",
          description: "Mano de obra, conexionado tablero secundario y pruebas bajo carga",
          quantity: 1,
          unitPrice: 165000,
          subtotal: 165000,
        },
      ],
    },
    {
      id: "quote_lucia_03",
      organizationId: DEFAULT_ORG_ID,
      customerId: "cust_lucia_03",
      publicToken: "cba-presupuesto-lucia-03",
      title: "Recableado Completo de Iluminación y Tomacorrientes",
      status: "DRAFT" as const,
      depositPercentage: 50,
      totalAmount: 404000,
      notes: "Se contempla mano de obra de pasaje de cables y recambio de módulos Jeluz Platino.",
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "qi_07",
          description: "Retiro de cables de tela e inserción de cables IRAM 2.5mm² y 1.5mm² (18 bocas)",
          quantity: 18,
          unitPrice: 18000,
          subtotal: 324000,
        },
        {
          id: "qi_08",
          description: "Provisión e instalación de módulos de punto y toma línea Jeluz Platino",
          quantity: 10,
          unitPrice: 8000,
          subtotal: 80000,
        },
      ],
    },
  ] as InMemQuote[],
  jobs: [
    {
      id: "job_camila_01",
      organizationId: DEFAULT_ORG_ID,
      customerId: "cust_camila_01",
      quoteId: "quote_camila_01",
      title: "Renovación Tablero Eléctrico y Certificación ERSeP",
      status: "IN_PROGRESS" as const,
      totalAmount: 210000,
      balanceDue: 105000,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Materiales comprados en Electro Alemán. Llevar taladro percutor.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "job_gonzalo_02",
      organizationId: DEFAULT_ORG_ID,
      customerId: "cust_gonzalo_02",
      title: "Urgencia Cortocircuito en Tablero Principal",
      status: "COMPLETED" as const,
      totalAmount: 95000,
      balanceDue: 0,
      scheduledDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Se cambió térmica fundida y se aisló empalme en bandeja.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "job_lucia_03",
      organizationId: DEFAULT_ORG_ID,
      customerId: "cust_lucia_03",
      title: "Visita Técnica y Relevamiento de Cañerías",
      status: "SCHEDULED" as const,
      totalAmount: 35000,
      balanceDue: 35000,
      scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Llevar pasacables metálico y tester de aislación.",
      createdAt: new Date().toISOString(),
    },
  ] as InMemJob[],
  payments: [
    {
      id: "pay_camila_01",
      organizationId: DEFAULT_ORG_ID,
      jobId: "job_camila_01",
      amount: 105000,
      paymentMethod: "MERCADO_PAGO" as const,
      status: "APPROVED" as const,
      mpPaymentId: "mp_pay_984321774",
      notes: "Seña 50% abonada online vía Mercado Pago Checkout",
      createdAt: new Date().toISOString(),
    },
    {
      id: "pay_gonzalo_02",
      organizationId: DEFAULT_ORG_ID,
      jobId: "job_gonzalo_02",
      amount: 95000,
      paymentMethod: "CASH" as const,
      status: "APPROVED" as const,
      notes: "Pago contado efectivo entregado por el encargado al finalizar el servicio.",
      createdAt: new Date().toISOString(),
    },
  ] as InMemPayment[],
};

let isDbReachable = true;

export async function isDatabaseOnline(): Promise<boolean> {
  return isDbReachable;
}

// Conexión ultrarrápida directa a PostgreSQL con fallback instantáneo si fallara
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryPrisma<T>(fn: () => Promise<T>, fallbackFn: () => any): Promise<T> {
  try {
    const result = await fn();
    isDbReachable = true;
    return result;
  } catch (err: unknown) {
    const errorMsg = String(err);
    if (
      errorMsg.includes("Can't reach database server") ||
      errorMsg.includes("P1001") ||
      errorMsg.includes("connect ECONNREFUSED") ||
      errorMsg.includes("The table") ||
      errorMsg.includes("does not exist") ||
      errorMsg.includes("InitializationError") ||
      errorMsg.includes("PrismaClientInitializationError")
    ) {
      isDbReachable = false;
      return await fallbackFn();
    }
    throw err;
  }
}

// 1. Obtener Organización (con caché en memoria instantánea de 60s)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedOrg: any = null;
let lastOrgTime = 0;

export async function getOrganization(orgId: string = DEFAULT_ORG_ID) {
  const now = Date.now();
  if (cachedOrg && now - lastOrgTime < 60000) {
    return cachedOrg;
  }

  const org = await tryPrisma(
    async () => {
      let found = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!found) {
        found = await prisma.organization.findFirst();
      }
      return found || (fallbackStore.org as any);
    },
    () => fallbackStore.org as any
  );

  cachedOrg = org;
  lastOrgTime = Date.now();
  return org;
}

// 2. Métricas del Dashboard Operativo
export async function getDashboardMetrics(orgId: string = DEFAULT_ORG_ID) {
  return tryPrisma(
    async () => {
      const [jobs, quotes, payments] = await Promise.all([
        prisma.job.findMany({
          where: { organizationId: orgId, deletedAt: null },
          include: { customer: true },
        }),
        prisma.quote.findMany({
          where: { organizationId: orgId, deletedAt: null },
          include: { customer: true },
        }),
        prisma.payment.findMany({
          where: { organizationId: orgId, status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      const balancePending = jobs
        .filter((j) => j.status !== "CANCELLED")
        .reduce((acc, curr) => acc + curr.balanceDue, 0);

      const quotesPending = quotes.filter(
        (q) => q.status === "SENT" || q.status === "DRAFT"
      ).length;

      const activeJobsWeek = jobs.filter(
        (j) => j.status === "SCHEDULED" || j.status === "IN_PROGRESS"
      ).length;

      const totalCollected = payments.reduce((acc, curr) => acc + curr.amount, 0);

      // Actividad reciente combinada
      const recentActivity = [
        ...quotes.slice(0, 3).map((q) => ({
          id: q.id,
          type: "quote" as const,
          title: q.title || `Presupuesto a ${q.customer.name}`,
          customer: q.customer.name,
          amount: q.totalAmount,
          status: q.status,
          date: q.createdAt.toISOString(),
          link: `/quotes`,
        })),
        ...jobs.slice(0, 3).map((j) => ({
          id: j.id,
          type: "job" as const,
          title: j.title,
          customer: j.customer.name,
          amount: j.totalAmount,
          status: j.status,
          date: j.createdAt.toISOString(),
          link: `/jobs/${j.id}`,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      return {
        balancePending,
        quotesPending,
        activeJobsWeek,
        totalCollected,
        recentActivity,
      };
    },
    () => {
      const balancePending = fallbackStore.jobs
        .filter((j) => j.status !== "CANCELLED")
        .reduce((acc, curr) => acc + curr.balanceDue, 0);

      const quotesPending = fallbackStore.quotes.filter(
        (q) => q.status === "SENT" || q.status === "DRAFT"
      ).length;

      const activeJobsWeek = fallbackStore.jobs.filter(
        (j) => j.status === "SCHEDULED" || j.status === "IN_PROGRESS"
      ).length;

      const totalCollected = fallbackStore.payments.reduce((acc, curr) => acc + curr.amount, 0);

      const recentActivity = [
        ...fallbackStore.quotes.map((q) => {
          const cust = fallbackStore.customers.find((c) => c.id === q.customerId);
          return {
            id: q.id,
            type: "quote" as const,
            title: q.title || `Presupuesto a ${cust?.name}`,
            customer: cust?.name || "Cliente",
            amount: q.totalAmount,
            status: q.status,
            date: q.createdAt,
            link: `/quotes`,
          };
        }),
        ...fallbackStore.jobs.map((j) => {
          const cust = fallbackStore.customers.find((c) => c.id === j.customerId);
          return {
            id: j.id,
            type: "job" as const,
            title: j.title,
            customer: cust?.name || "Cliente",
            amount: j.totalAmount,
            status: j.status,
            date: j.createdAt,
            link: `/jobs/${j.id}`,
          };
        }),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      return {
        balancePending,
        quotesPending,
        activeJobsWeek,
        totalCollected,
        recentActivity,
      };
    }
  );
}

// 3. Clientes
export async function getCustomers(orgId: string = DEFAULT_ORG_ID) {
  return tryPrisma(
    async () => {
      return await prisma.customer.findMany({
        where: { organizationId: orgId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
    },
    () => fallbackStore.customers
  );
}

export async function createCustomer(orgId: string = DEFAULT_ORG_ID, data: CustomerFormData) {
  return tryPrisma(
    async () => {
      return await prisma.customer.create({
        data: {
          organizationId: orgId,
          name: data.name,
          phone: data.phone,
          address: data.address,
          neighborhood: data.neighborhood,
          notes: data.notes || null,
        },
      });
    },
    () => {
      const newCustomer: InMemCustomer = {
        id: `cust_${randomUUID().slice(0, 8)}`,
        organizationId: orgId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        neighborhood: data.neighborhood,
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };
      fallbackStore.customers.unshift(newCustomer);
      return newCustomer;
    }
  );
}

// 4. Servicios
export async function getServices(orgId: string = DEFAULT_ORG_ID) {
  return tryPrisma(
    async () => {
      return await prisma.service.findMany({
        where: { organizationId: orgId, deletedAt: null },
      });
    },
    () => fallbackStore.services
  );
}

// 5. Presupuestos (Quotes)
export async function getQuotes(orgId: string = DEFAULT_ORG_ID) {
  return tryPrisma(
    async () => {
      return await prisma.quote.findMany({
        where: { organizationId: orgId, deletedAt: null },
        include: {
          customer: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });
    },
    () => {
      return fallbackStore.quotes.map((q) => ({
        ...q,
        customer: fallbackStore.customers.find((c) => c.id === q.customerId) || {
          id: q.customerId,
          name: "Cliente",
          phone: "+5493510000000",
          address: "Córdoba",
          neighborhood: "Córdoba",
        },
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.createdAt),
        expiresAt: new Date(Date.now() + 15 * 86400000),
      }));
    }
  );
}

export async function getQuoteByPublicToken(token: string) {
  return tryPrisma(
    async () => {
      const quote = await prisma.quote.findUnique({
        where: { publicToken: token },
        include: {
          customer: true,
          organization: true,
          items: true,
        },
      });
      return quote;
    },
    () => {
      const q = fallbackStore.quotes.find((item) => item.publicToken === token);
      if (!q) return null;
      const customer = fallbackStore.customers.find((c) => c.id === q.customerId);
      return {
        ...q,
        customer: customer || {
          id: q.customerId,
          name: "Cliente",
          phone: "+5493510000000",
          address: "Córdoba",
          neighborhood: "Córdoba",
        },
        organization: fallbackStore.org,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.createdAt),
        expiresAt: new Date(Date.now() + 15 * 86400000),
      };
    }
  );
}

export async function createQuote(orgId: string = DEFAULT_ORG_ID, input: QuoteCreateInput) {
  const totalAmount = input.items.reduce(
    (acc, curr) => acc + curr.quantity * curr.unitPrice,
    0
  );
  const publicToken = randomUUID();
  const quoteNumber = `EC-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
  const validityDays = input.validityDays || 10;

  return tryPrisma(
    async () => {
      return await prisma.quote.create({
        data: {
          organizationId: orgId,
          customerId: input.customerId,
          title: input.title,
          quoteNumber,
          validityDays,
          depositPercentage: input.depositPercentage,
          totalAmount,
          publicToken,
          notes: input.notes,
          status: "SENT",
          expiresAt: new Date(Date.now() + validityDays * 86400000),
          items: {
            create: input.items.map((i) => ({
              description: i.description,
              itemType: (i.itemType as any) || "LABOR",
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.quantity * i.unitPrice,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });
    },
    () => {
      const newQuote: any = {
        id: `quote_${randomUUID().slice(0, 8)}`,
        organizationId: orgId,
        customerId: input.customerId,
        publicToken,
        quoteNumber,
        validityDays,
        title: input.title,
        status: "SENT",
        depositPercentage: input.depositPercentage,
        totalAmount,
        notes: input.notes,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + validityDays * 86400000).toISOString(),
        items: input.items.map((i) => ({
          id: `qi_${randomUUID().slice(0, 8)}`,
          description: i.description,
          itemType: i.itemType || "LABOR",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          subtotal: i.quantity * i.unitPrice,
        })),
      };
      fallbackStore.quotes.unshift(newQuote);
      return {
        ...newQuote,
        customer: fallbackStore.customers.find((c) => c.id === input.customerId),
      };
    }
  );
}

export async function updateQuoteStatus(
  quoteId: string,
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CONVERTED"
) {
  return tryPrisma(
    async () => {
      return await prisma.quote.update({
        where: { id: quoteId },
        data: { status },
      });
    },
    () => {
      const q = fallbackStore.quotes.find((item) => item.id === quoteId);
      if (q) q.status = status;
      return q;
    }
  );
}

// 6. Órdenes de Trabajo (Jobs)
export async function getJobs(orgId: string = DEFAULT_ORG_ID) {
  return tryPrisma(
    async () => {
      return await prisma.job.findMany({
        where: { organizationId: orgId, deletedAt: null },
        include: {
          customer: true,
          payments: {
            where: { status: "APPROVED" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    () => {
      return fallbackStore.jobs.map((j) => ({
        ...j,
        customer: fallbackStore.customers.find((c) => c.id === j.customerId) || {
          id: j.customerId,
          name: "Cliente",
          phone: "+5493510000000",
          address: "Córdoba",
          neighborhood: "Córdoba",
        },
        payments: fallbackStore.payments.filter(
          (p) => p.jobId === j.id && p.status === "APPROVED"
        ),
        createdAt: new Date(j.createdAt),
        updatedAt: new Date(j.createdAt),
        scheduledDate: j.scheduledDate ? new Date(j.scheduledDate) : null,
      }));
    }
  );
}

export async function getJobById(jobId: string) {
  return tryPrisma(
    async () => {
      return await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          customer: true,
          quote: {
            include: { items: true },
          },
          payments: {
            orderBy: { createdAt: "desc" },
          },
          organization: true,
        },
      });
    },
    () => {
      const j = fallbackStore.jobs.find((item) => item.id === jobId);
      if (!j) return null;
      const customer = fallbackStore.customers.find((c) => c.id === j.customerId);
      const quote = j.quoteId
        ? fallbackStore.quotes.find((q) => q.id === j.quoteId)
        : null;
      const payments = fallbackStore.payments
        .filter((p) => p.jobId === j.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        ...j,
        customer: customer || {
          id: j.customerId,
          name: "Cliente",
          phone: "+5493510000000",
          address: "Córdoba",
          neighborhood: "Córdoba",
        },
        quote: quote || null,
        payments: payments.map((p) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.createdAt),
        })),
        organization: fallbackStore.org,
        createdAt: new Date(j.createdAt),
        updatedAt: new Date(j.createdAt),
        scheduledDate: j.scheduledDate ? new Date(j.scheduledDate) : null,
      };
    }
  );
}

export async function updateJobStatus(
  jobId: string,
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
) {
  return tryPrisma(
    async () => {
      return await prisma.job.update({
        where: { id: jobId },
        data: {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
    },
    () => {
      const j = fallbackStore.jobs.find((item) => item.id === jobId);
      if (j) {
        j.status = status;
        if (status === "COMPLETED") j.completedAt = new Date().toISOString();
      }
      return j;
    }
  );
}

// 7. Pagos y Cobranzas
export async function recordPayment(
  orgId: string = DEFAULT_ORG_ID,
  input: ManualPaymentInput & { mpPaymentId?: string; mpPreferenceId?: string }
) {
  return tryPrisma(
    async () => {
      // Usar transacción para registrar pago y actualizar saldo del job
      const result = await prisma.$transaction(async (tx) => {
        const job = await tx.job.findUnique({
          where: { id: input.jobId },
        });

        if (!job) throw new Error("Orden de trabajo no encontrada");

        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            jobId: input.jobId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            status: "APPROVED",
            mpPaymentId: input.mpPaymentId,
            mpPreferenceId: input.mpPreferenceId,
            notes: input.notes,
          },
        });

        const newBalance = Math.max(0, job.balanceDue - input.amount);
        const shouldComplete = newBalance === 0 && job.status === "IN_PROGRESS";

        const updatedJob = await tx.job.update({
          where: { id: input.jobId },
          data: {
            balanceDue: newBalance,
            ...(shouldComplete ? { status: "COMPLETED", completedAt: new Date() } : {}),
          },
        });

        return { payment, job: updatedJob };
      });

      return result;
    },
    () => {
      const job = fallbackStore.jobs.find((item) => item.id === input.jobId);
      if (!job) throw new Error("Orden de trabajo no encontrada");

      const payment: InMemPayment = {
        id: `pay_${randomUUID().slice(0, 8)}`,
        organizationId: orgId,
        jobId: input.jobId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        status: "APPROVED",
        mpPaymentId: input.mpPaymentId,
        notes: input.notes,
        createdAt: new Date().toISOString(),
      };
      fallbackStore.payments.push(payment);

      job.balanceDue = Math.max(0, job.balanceDue - input.amount);
      if (job.balanceDue === 0 && job.status === "IN_PROGRESS") {
        job.status = "COMPLETED";
        job.completedAt = new Date().toISOString();
      }

      return { payment, job };
    }
  );
}

// 8. Convertir Presupuesto a Orden de Trabajo (al aprobarse o pagarse seña)
export async function convertQuoteToJob(quoteId: string) {
  return tryPrisma(
    async () => {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { job: true },
      });

      if (!quote) throw new Error("Presupuesto no encontrado");
      if (quote.job) return quote.job; // Ya tiene job asignado

      // Crear Job
      const newJob = await prisma.job.create({
        data: {
          organizationId: quote.organizationId,
          customerId: quote.customerId,
          quoteId: quote.id,
          title: quote.title || "Trabajo Eléctrico Presupuestado",
          status: "IN_PROGRESS",
          totalAmount: quote.totalAmount,
          balanceDue: quote.totalAmount,
          scheduledDate: new Date(Date.now() + 2 * 86400000),
          notes: quote.notes,
        },
      });

      // Actualizar estado del quote a CONVERTED
      await prisma.quote.update({
        where: { id: quoteId },
        data: { status: "CONVERTED" },
      });

      return newJob;
    },
    () => {
      const quote = fallbackStore.quotes.find((q) => q.id === quoteId);
      if (!quote) throw new Error("Presupuesto no encontrado");

      const existingJob = fallbackStore.jobs.find((j) => j.quoteId === quoteId);
      if (existingJob) return existingJob;

      const newJob: InMemJob = {
        id: `job_${randomUUID().slice(0, 8)}`,
        organizationId: quote.organizationId,
        customerId: quote.customerId,
        quoteId: quote.id,
        title: quote.title || "Trabajo Eléctrico Presupuestado",
        status: "IN_PROGRESS",
        totalAmount: quote.totalAmount,
        balanceDue: quote.totalAmount,
        scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        notes: quote.notes,
        createdAt: new Date().toISOString(),
      };

      fallbackStore.jobs.unshift(newJob);
      quote.status = "CONVERTED";
      return newJob;
    }
  );
}
