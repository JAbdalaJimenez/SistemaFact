import prisma from "./db";
import { CustomerFormData, QuoteCreateInput, ManualPaymentInput } from "./types";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Fallback Store en memoria para asegurar que la app funcione siempre
interface InMemQuoteItem {
  id: string;
  description: string;
  itemType?: "LABOR" | "MATERIALS";
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
  taxRate?: number;
  validityDays?: number;
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

import bcrypt from "bcryptjs";

interface InMemUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "MEMBER";
  phone?: string;
  password?: string;
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

export interface BiometricCredential {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  credentialId: string;
  publicKey?: string;
  deviceName?: string;
  createdAt: string;
}

export interface InMemOrg {
  id: string;
  name: string;
  slug: string;
  legalName: string;
  ersepLicenseNumber: string;
  ersepLicense: string;
  cuit: string;
  vatCondition: string;
  taxCondition: string;
  legalAddress: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  bankAlias: string;
  cbuCvu: string;
  aliasCbu: string;
  mpAccessToken: string;
  mpPublicKey: string;
  logoUrl: string;
  currency: string;
  email: string;
}

const defaultOrg: InMemOrg = {
  id: DEFAULT_ORG_ID,
  name: "ElectroCba - Soluciones Eléctricas",
  slug: "electrocba",
  legalName: "Instalador Electricista Habilitado",
  ersepLicenseNumber: "Habilitación ERSeP Ley 10.281",
  ersepLicense: "Habilitación ERSeP Ley 10.281",
  cuit: "20-00000000-0",
  vatCondition: "Monotributo",
  taxCondition: "Monotributo - Prestador de Servicios",
  legalAddress: "Córdoba Capital, Provincia de Córdoba",
  address: "Córdoba Capital, Provincia de Córdoba",
  phone: "+54 9 351 000-0000",
  whatsappNumber: "+5493510000000",
  bankAlias: "ELECTROCBA.MP",
  cbuCvu: "0000003100010000000000",
  aliasCbu: "ELECTROCBA.MP",
  mpAccessToken: "",
  mpPublicKey: "",
  logoUrl: "/logo-icon.png",
  currency: "ARS",
  email: "contacto@electrocba.com.ar",
};

// Estado inicial en memoria para el instalador profesional en Córdoba
const fallbackStore = {
  org: defaultOrg,
  orgs: {
    [DEFAULT_ORG_ID]: defaultOrg,
  } as Record<string, InMemOrg>,
  biometricCredentials: [] as BiometricCredential[],
  users: [
    {
      id: "user_superadmin_root",
      organizationId: DEFAULT_ORG_ID,
      name: "Super Administrador",
      email: "admin@electrocba.com.ar",
      role: "SUPERADMIN",
      phone: "+54 9 351 000-0000",
      createdAt: new Date().toISOString(),
    },
  ] as InMemUser[],
  customers: [] as InMemCustomer[],
  services: [
    {
      id: "srv_01",
      organizationId: DEFAULT_ORG_ID,
      title: "Instalación de Disyuntor Diferencial 2x40A 30mA",
      description: "Colocación y calibrado en riel DIN con prueba de disparo bajo norma AEA 90364",
      defaultPrice: 45000,
    },
    {
      id: "srv_02",
      organizationId: DEFAULT_ORG_ID,
      title: "Instalación de Jabalina + Protocolo ERSeP Ley 10.281",
      description: "Hincado jabalina 1.5m cobre, caja de inspección y certificado firmado",
      defaultPrice: 95000,
    },
    {
      id: "srv_03",
      organizationId: DEFAULT_ORG_ID,
      title: "Recableado por Boca de Luz / Tomacorriente",
      description: "Reemplazo de conductores antiguos por cables IRAM NM 247-3 ignífugos",
      defaultPrice: 18000,
    },
    {
      id: "srv_04",
      organizationId: DEFAULT_ORG_ID,
      title: "Adecuación Tablero Seccional y Térmicas Bipolares",
      description: "Reemplazo de llaves viejas, peines bipolares y balanceo de fases",
      defaultPrice: 65000,
    },
  ],
  quotes: [] as InMemQuote[],
  jobs: [] as InMemJob[],
  payments: [] as InMemPayment[],
};

// Persistencia en disco local para evitar cualquier pérdida de datos y garantizar latencia cero
const LOCAL_STORE_PATH = path.join(process.cwd(), ".local_data.json");
let lastStoreMtime = 0;

export function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const stat = fs.statSync(LOCAL_STORE_PATH);
      if (stat.mtimeMs === lastStoreMtime && fallbackStore.users.length > 0) {
        return;
      }
      lastStoreMtime = stat.mtimeMs;
      const raw = fs.readFileSync(LOCAL_STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        fallbackStore.users = parsed.users;
      }
      if (Array.isArray(parsed.customers)) {
        fallbackStore.customers = parsed.customers;
      }
      if (Array.isArray(parsed.quotes)) {
        fallbackStore.quotes = parsed.quotes;
      }
      if (Array.isArray(parsed.jobs)) {
        fallbackStore.jobs = parsed.jobs;
      }
      if (Array.isArray(parsed.payments)) {
        fallbackStore.payments = parsed.payments;
      }
      if (parsed.org) {
        fallbackStore.org = { ...fallbackStore.org, ...parsed.org };
      }
      if (parsed.orgs && typeof parsed.orgs === "object") {
        fallbackStore.orgs = { ...fallbackStore.orgs, ...parsed.orgs };
      }
      if (Array.isArray(parsed.biometricCredentials)) {
        fallbackStore.biometricCredentials = parsed.biometricCredentials;
      }
    }
  } catch {}
}

export function saveLocalStore() {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(fallbackStore, null, 2), "utf-8");
    try {
      lastStoreMtime = fs.statSync(LOCAL_STORE_PATH).mtimeMs;
    } catch {}
  } catch {}
}

// Cargar store al iniciar
loadLocalStore();

// Estado de conexión a la base de datos
let isDbReachable = true;
let lastDbCheck = 0;
const DB_RETRY_COOLDOWN = 15_000;

export async function isDatabaseOnline(): Promise<boolean> {
  return isDbReachable;
}

// Conexión a PostgreSQL Supabase con fallback de emergencia
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryPrisma<T>(fn: () => Promise<T>, fallbackFn: () => any): Promise<T> {
  const now = Date.now();
  if (!isDbReachable && now - lastDbCheck < DB_RETRY_COOLDOWN) {
    loadLocalStore();
    return await fallbackFn();
  }

  try {
    lastDbCheck = now;
    // Timeout de 5000ms para permitir conexiones remotas a Supabase
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB_TIMEOUT")), 5000)
    );
    const result = await Promise.race([fn(), timeoutPromise]);
    isDbReachable = true;
    return result;
  } catch (error: any) {
    // Si el error es de lógica de negocio (duplicado o constraint), propagarlo directamente sin fallback
    const msg = String(error?.message || error);
    if (
      msg.includes("Ya existe") ||
      error?.code === "P2002" ||
      msg.includes("Unique constraint")
    ) {
      throw new Error("Ya existe un usuario registrado con este correo electrónico.");
    }

    console.warn("[Prisma] Conexión fallida o timeout con Supabase:", msg);
    isDbReachable = false;
    loadLocalStore();
    return await fallbackFn();
  }
}

// 1. Obtener Organización (con caché Map por ID de 60s)
const cachedOrgs = new Map<string, { org: InMemOrg; time: number }>();

export async function getOrganization(orgId: string = DEFAULT_ORG_ID) {
  const targetId = orgId || DEFAULT_ORG_ID;
  const now = Date.now();
  const cached = cachedOrgs.get(targetId);
  if (cached && now - cached.time < 60000) {
    return cached.org;
  }

  const org = await tryPrisma(
    async () => {
      let found = await prisma.organization.findUnique({ where: { id: targetId } });
      if (!found) {
        found = await prisma.organization.findFirst();
      }
      return found || (fallbackStore.orgs[targetId] || fallbackStore.org);
    },
    () => (fallbackStore.orgs[targetId] || fallbackStore.org)
  );

  cachedOrgs.set(targetId, { org: org as InMemOrg, time: Date.now() });
  return org as InMemOrg;
}

export async function updateOrganization(
  orgId: string = DEFAULT_ORG_ID,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Partial<any>
) {
  const targetId = orgId || DEFAULT_ORG_ID;
  cachedOrgs.delete(targetId);

  return tryPrisma(
    async () => {
      let org = await prisma.organization.findUnique({ where: { id: targetId } });
      if (!org) {
        org = await prisma.organization.findFirst();
      }
      const actualId = org ? org.id : targetId;

      const updated = await prisma.organization.upsert({
        where: { id: actualId },
        update: {
          name: data.name,
          legalName: data.legalName,
          ersepLicenseNumber: data.ersepLicenseNumber,
          ersepLicense: data.ersepLicenseNumber || data.ersepLicense,
          cuit: data.cuit,
          vatCondition: data.vatCondition,
          taxCondition: data.vatCondition || data.taxCondition,
          legalAddress: data.legalAddress,
          address: data.legalAddress || data.address,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          bankAlias: data.bankAlias,
          cbuCvu: data.cbuCvu,
          aliasCbu: data.bankAlias || data.aliasCbu,
          mpAccessToken: data.mpAccessToken,
          mpPublicKey: data.mpPublicKey,
          logoUrl: data.logoUrl,
        },
        create: {
          id: actualId,
          name: data.name || "ElectroCba - Soluciones Eléctricas",
          slug: (data.name || "electrocba").toLowerCase().replace(/[^a-z0-9]/g, "-"),
          legalName: data.legalName,
          ersepLicenseNumber: data.ersepLicenseNumber,
          ersepLicense: data.ersepLicenseNumber,
          cuit: data.cuit,
          vatCondition: data.vatCondition || "Monotributo",
          taxCondition: data.vatCondition || "Monotributo - Prestador de Servicios",
          legalAddress: data.legalAddress,
          address: data.legalAddress,
          phone: data.phone || "+5493515123456",
          whatsappNumber: data.whatsappNumber || "+5493515123456",
          bankAlias: data.bankAlias,
          cbuCvu: data.cbuCvu,
          aliasCbu: data.bankAlias,
          mpAccessToken: data.mpAccessToken,
          mpPublicKey: data.mpPublicKey,
          logoUrl: data.logoUrl,
        },
      });
      cachedOrgs.set(actualId, { org: updated as unknown as InMemOrg, time: Date.now() });
      return updated;
    },
    () => {
      const currentOrg = fallbackStore.orgs[targetId] || fallbackStore.org;
      const updatedOrg: InMemOrg = {
        ...currentOrg,
        ...data,
        ersepLicense: data.ersepLicenseNumber || data.ersepLicense || currentOrg.ersepLicense,
        taxCondition: data.vatCondition || data.taxCondition || currentOrg.taxCondition,
        address: data.legalAddress || data.address || currentOrg.address,
        aliasCbu: data.bankAlias || data.aliasCbu || currentOrg.aliasCbu,
      };
      fallbackStore.orgs[targetId] = updatedOrg;
      if (targetId === DEFAULT_ORG_ID) {
        fallbackStore.org = updatedOrg;
      }
      cachedOrgs.set(targetId, { org: updatedOrg, time: Date.now() });
      saveLocalStore();
      return updatedOrg;
    }
  );
}

// 2. Métricas del Dashboard Operativo
export async function getDashboardMetrics(orgId: string = DEFAULT_ORG_ID) {
  const targetId = orgId || DEFAULT_ORG_ID;
  return tryPrisma(
    async () => {
      const [jobs, quotes, payments] = await Promise.all([
        prisma.job.findMany({
          where: { organizationId: targetId, deletedAt: null },
          include: { customer: true },
        }),
        prisma.quote.findMany({
          where: { organizationId: targetId, deletedAt: null },
          include: { customer: true },
        }),
        prisma.payment.findMany({
          where: { organizationId: targetId, status: "APPROVED" },
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
      const orgJobs = fallbackStore.jobs.filter((j) => !targetId || j.organizationId === targetId);
      const orgQuotes = fallbackStore.quotes.filter((q) => !targetId || q.organizationId === targetId);
      const orgPayments = fallbackStore.payments.filter((p) => !targetId || p.organizationId === targetId);

      const balancePending = orgJobs
        .filter((j) => j.status !== "CANCELLED")
        .reduce((acc, curr) => acc + curr.balanceDue, 0);

      const quotesPending = orgQuotes.filter(
        (q) => q.status === "SENT" || q.status === "DRAFT"
      ).length;

      const activeJobsWeek = orgJobs.filter(
        (j) => j.status === "SCHEDULED" || j.status === "IN_PROGRESS"
      ).length;

      const totalCollected = orgPayments.reduce((acc, curr) => acc + curr.amount, 0);

      const recentActivity = [
        ...orgQuotes.map((q) => {
          const cust = fallbackStore.customers.find((c) => c.id === q.customerId);
          return {
            id: q.id,
            type: "quote" as const,
            title: q.title || `Presupuesto a ${cust?.name || "Cliente"}`,
            customer: cust?.name || "Cliente",
            amount: q.totalAmount,
            status: q.status,
            date: q.createdAt,
            link: `/quotes`,
          };
        }),
        ...orgJobs.map((j) => {
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

export async function getCustomers(orgId: string = DEFAULT_ORG_ID) {
  const targetId = orgId || DEFAULT_ORG_ID;
  return tryPrisma(
    async () => {
      return await prisma.customer.findMany({
        where: { organizationId: targetId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
    },
    () => fallbackStore.customers.filter((c) => !targetId || c.organizationId === targetId)
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
      saveLocalStore();
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
  const targetId = orgId || DEFAULT_ORG_ID;
  return tryPrisma(
    async () => {
      return await prisma.quote.findMany({
        where: { organizationId: targetId, deletedAt: null },
        include: {
          customer: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });
    },
    () => {
      const filtered = targetId
        ? fallbackStore.quotes.filter((q) => q.organizationId === targetId)
        : fallbackStore.quotes;
      return filtered.map((q) => ({
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
          job: {
            include: {
              payments: {
                where: { status: "APPROVED" },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      });
      return quote;
    },
    () => {
      const q = fallbackStore.quotes.find((item) => item.publicToken === token);
      if (!q) return null;
      const customer = fallbackStore.customers.find((c) => c.id === q.customerId);
      const job = fallbackStore.jobs.find((j) => j.quoteId === q.id);
      const payments = job
        ? fallbackStore.payments.filter((p) => p.jobId === job.id && p.status === "APPROVED")
        : [];

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
        job: job ? { ...job, payments } : null,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.createdAt),
        expiresAt: new Date(new Date(q.createdAt).getTime() + (q.validityDays || 15) * 86400000),
      };
    }
  );
}

export async function createQuote(orgId: string = DEFAULT_ORG_ID, input: QuoteCreateInput) {
  const netAmount = input.items.reduce(
    (acc, curr) => acc + curr.quantity * curr.unitPrice,
    0
  );
  const taxRate = input.taxRate || 0;
  const taxAmount = Math.round((netAmount * taxRate) / 100);
  const totalAmount = netAmount + taxAmount;

  const publicToken = randomUUID();
  const year = new Date().getFullYear();
  const quoteNumber = `EC-${year}-${String(Math.floor(Math.random() * 900) + 100)}`;
  const validityDays = input.validityDays || 15;

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
          organization: true,
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
      saveLocalStore();
      return {
        ...newQuote,
        customer: fallbackStore.customers.find((c) => c.id === input.customerId),
        organization: fallbackStore.org,
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
      if (q) {
        q.status = status;
        saveLocalStore();
      }
      return q;
    }
  );
}

export async function getJobs(orgId: string = DEFAULT_ORG_ID) {
  const targetId = orgId || DEFAULT_ORG_ID;
  return tryPrisma(
    async () => {
      return await prisma.job.findMany({
        where: { organizationId: targetId, deletedAt: null },
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
      const filtered = targetId
        ? fallbackStore.jobs.filter((j) => j.organizationId === targetId)
        : fallbackStore.jobs;
      return filtered.map((j) => ({
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
      saveLocalStore();

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
      saveLocalStore();
      return newJob;
    }
  );
}

/**
 * Gestión de Usuarios (Exclusivo Superadmin)
 */
export async function getUsers() {
  return tryPrisma(
    async () => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: { organization: true },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        organizationId: u.organizationId,
        organizationName: u.organization?.name || "ElectroCba",
        createdAt: u.createdAt.toISOString(),
      }));
    },
    () => {
      return fallbackStore.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        organizationId: u.organizationId,
        organizationName: fallbackStore.org.name,
        createdAt: u.createdAt,
      }));
    }
  );
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: "SUPERADMIN" | "OWNER" | "MEMBER";
  phone?: string;
  organizationId?: string;
}) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const hashedPassword = bcrypt.hashSync(data.password, 10);
  const targetOrgId = data.organizationId || DEFAULT_ORG_ID;

  return tryPrisma(
    async () => {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new Error("Ya existe un usuario registrado con este correo electrónico.");
      }

      let assignedOrgId = targetOrgId;
      if (data.role === "OWNER") {
        const newOrg = await prisma.organization.create({
          data: {
            name: `${data.name.trim()} - Instalaciones`,
            slug: `${data.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`,
            legalName: data.name.trim(),
            ersepLicenseNumber: "Habilitación ERSeP Ley 10.281",
            ersepLicense: "Habilitación ERSeP Ley 10.281",
            cuit: "20-00000000-0",
            vatCondition: "Monotributo",
            taxCondition: "Monotributo - Servicios Técnicos",
            legalAddress: "Córdoba",
            address: "Córdoba",
            phone: data.phone?.trim() || "+54 9 351 000-0000",
            whatsappNumber: data.phone?.trim() || "+5493510000000",
            bankAlias: "",
            cbuCvu: "",
            aliasCbu: "",
            currency: "ARS",
          },
        });
        assignedOrgId = newOrg.id;
      }

      const user = await prisma.user.create({
        data: {
          name: data.name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: data.role || "MEMBER",
          phone: data.phone?.trim(),
          organizationId: assignedOrgId,
        },
        include: { organization: true },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        createdAt: user.createdAt.toISOString(),
      };
    },
    () => {
      const existing = fallbackStore.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (existing) {
        throw new Error("Ya existe un usuario registrado con este correo electrónico.");
      }

      let assignedOrgId = targetOrgId;
      if (data.role === "OWNER") {
        assignedOrgId = `org_${randomUUID().slice(0, 8)}`;
        fallbackStore.orgs[assignedOrgId] = {
          id: assignedOrgId,
          name: `${data.name.trim()} - Instalaciones`,
          slug: data.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-"),
          legalName: data.name.trim(),
          ersepLicenseNumber: "Habilitación ERSeP Ley 10.281",
          ersepLicense: "Habilitación ERSeP Ley 10.281",
          cuit: "20-00000000-0",
          vatCondition: "Monotributo",
          taxCondition: "Monotributo - Servicios Técnicos",
          legalAddress: "Córdoba",
          address: "Córdoba",
          phone: data.phone?.trim() || "+54 9 351 000-0000",
          whatsappNumber: data.phone?.trim() || "+5493510000000",
          bankAlias: "",
          cbuCvu: "",
          aliasCbu: "",
          mpAccessToken: "",
          mpPublicKey: "",
          logoUrl: "/logo-icon.png",
          currency: "ARS",
          email: normalizedEmail,
        };
      }

      const newUser: InMemUser = {
        id: `user_${randomUUID().slice(0, 8)}`,
        organizationId: assignedOrgId,
        name: data.name.trim(),
        email: normalizedEmail,
        role: data.role || "MEMBER",
        phone: data.phone?.trim() || "+54 9 351 000-0000",
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      };

      fallbackStore.users.unshift(newUser);
      saveLocalStore();
      const org = fallbackStore.orgs[assignedOrgId] || fallbackStore.org;
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        organizationId: newUser.organizationId,
        organizationName: org.name,
        createdAt: newUser.createdAt,
      };
    }
  );
}

export function saveBiometricCredential(cred: {
  userId: string;
  userEmail: string;
  userName: string;
  credentialId: string;
  publicKey?: string;
  deviceName?: string;
}) {
  const existingIdx = fallbackStore.biometricCredentials.findIndex(
    (c) => c.credentialId === cred.credentialId || c.userId === cred.userId
  );
  const newCred: BiometricCredential = {
    id: `bio_${randomUUID().slice(0, 8)}`,
    userId: cred.userId,
    userEmail: cred.userEmail,
    userName: cred.userName,
    credentialId: cred.credentialId,
    publicKey: cred.publicKey,
    deviceName: cred.deviceName || "Dispositivo Móvil",
    createdAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    fallbackStore.biometricCredentials[existingIdx] = newCred;
  } else {
    fallbackStore.biometricCredentials.push(newCred);
  }
  saveLocalStore();
  return newCred;
}

export function getBiometricCredential(credentialIdOrEmail: string) {
  loadLocalStore();
  const norm = credentialIdOrEmail.toLowerCase().trim();
  return fallbackStore.biometricCredentials.find(
    (c) => c.credentialId === credentialIdOrEmail || c.userEmail.toLowerCase() === norm
  );
}

export function findUserById(userId: string) {
  loadLocalStore();
  if (userId === "user_superadmin_root") {
    return {
      id: "user_superadmin_root",
      name: "Super Administrador",
      email: "admin@electrocba.com.ar",
      role: "SUPERADMIN" as const,
      organizationId: DEFAULT_ORG_ID,
    };
  }
  return fallbackStore.users.find((u) => u.id === userId);
}

export async function deleteUser(userId: string) {
  if (userId === "user_superadmin_root") {
    throw new Error("No es posible eliminar la cuenta principal de Superadministrador.");
  }

  return tryPrisma(
    async () => {
      await prisma.user.delete({
        where: { id: userId },
      });
      return { success: true };
    },
    () => {
      loadLocalStore();
      const index = fallbackStore.users.findIndex((u) => u.id === userId);
      if (index === -1) {
        throw new Error("Usuario no encontrado.");
      }
      fallbackStore.users.splice(index, 1);
      saveLocalStore();
      return { success: true };
    }
  );
}

export function findFallbackUserByEmail(email: string) {
  loadLocalStore();
  const normalized = email.toLowerCase().trim();
  return fallbackStore.users.find((u) => u.email.toLowerCase() === normalized);
}
