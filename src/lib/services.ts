import prisma from "./db";
import { CustomerFormData, QuoteCreateInput, ManualPaymentInput } from "./types";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto";

// 1. Obtener Organización
export async function getOrganization(organizationId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  const found = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!found) {
    throw new Error("Organización no encontrada");
  }
  return found;
}

export async function updateOrganization(
  organizationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Partial<any>
) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }

  const existing = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { mpAccessToken: true, mpWebhookSecret: true },
  });

  if (!existing) {
    throw new Error("Organización no encontrada");
  }

  let mpAccessTokenToSave = existing.mpAccessToken;
  let mpWebhookSecretToSave = existing.mpWebhookSecret;
  if (typeof data.mpWebhookSecret === 'string') {
    const trimmedSecret = data.mpWebhookSecret.trim();
    if (trimmedSecret.length > 0 && !trimmedSecret.startsWith('••••••••')) {
      mpWebhookSecretToSave = encryptSecret(trimmedSecret);
    }
  }
  if (typeof data.mpAccessToken === "string") {
    const trimmed = data.mpAccessToken.trim();
    if (trimmed.length > 0 && !trimmed.startsWith("••••••••")) {
      mpAccessTokenToSave = encryptSecret(trimmed);
    }
  }

  return await prisma.organization.update({
    where: { id: organizationId },
    data: {
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
      mpAccessToken: mpAccessTokenToSave,
      mpWebhookSecret: mpWebhookSecretToSave,
      mpPublicKey: data.mpPublicKey,
      logoUrl: data.logoUrl,
      signatureUrl: data.signatureUrl,
      email: data.email,
    },
  });
}

// 2. Métricas del Dashboard Operativo (1 sola consulta SQL CTE)
interface DashboardActivityRow {
  id: string;
  type: "quote" | "job";
  title: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
  link: string;
}

interface DashboardMetricsRow {
  balance_pending: bigint | number;
  quotes_pending: bigint | number;
  active_jobs_week: bigint | number;
  total_collected: bigint | number;
  recent_activity: DashboardActivityRow[] | null;
}

export async function getDashboardMetrics(organizationId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }

  const rows = await prisma.$queryRaw<DashboardMetricsRow[]>`
    WITH
      job_stats AS (
        SELECT
          COALESCE(SUM("balanceDue") FILTER (WHERE status <> 'CANCELLED'), 0)::bigint AS balance_pending,
          COUNT(*) FILTER (WHERE status IN ('SCHEDULED', 'IN_PROGRESS'))::bigint AS active_jobs_week
        FROM jobs
        WHERE "organizationId" = ${organizationId} AND "deletedAt" IS NULL
      ),
      quote_stats AS (
        SELECT COUNT(*) FILTER (WHERE status IN ('SENT', 'DRAFT'))::bigint AS quotes_pending
        FROM quotes
        WHERE "organizationId" = ${organizationId} AND "deletedAt" IS NULL
      ),
      payment_stats AS (
        SELECT COALESCE(SUM(amount), 0)::bigint AS total_collected
        FROM (
          SELECT amount FROM payments
          WHERE "organizationId" = ${organizationId} AND status = 'APPROVED'
          ORDER BY "createdAt" DESC
          LIMIT 5
        ) p
      ),
      recent_quotes AS (
        SELECT
          q.id,
          'quote'::text AS type,
          COALESCE(NULLIF(q.title, ''), 'Presupuesto a ' || c.name) AS title,
          c.name AS customer,
          q."totalAmount" AS amount,
          q.status::text AS status,
          to_char(q."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date,
          '/quotes'::text AS link,
          q."createdAt" AS sort_at
        FROM quotes q
        JOIN customers c ON c.id = q."customerId"
        WHERE q."organizationId" = ${organizationId} AND q."deletedAt" IS NULL
        ORDER BY q."createdAt" DESC
        LIMIT 3
      ),
      recent_jobs AS (
        SELECT
          j.id,
          'job'::text AS type,
          j.title AS title,
          c.name AS customer,
          j."totalAmount" AS amount,
          j.status::text AS status,
          to_char(j."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date,
          ('/jobs/' || j.id)::text AS link,
          j."createdAt" AS sort_at
        FROM jobs j
        JOIN customers c ON c.id = j."customerId"
        WHERE j."organizationId" = ${organizationId} AND j."deletedAt" IS NULL
        ORDER BY j."createdAt" DESC
        LIMIT 3
      ),
      recent AS (
        SELECT id, type, title, customer, amount, status, date, link
        FROM (
          SELECT * FROM recent_quotes
          UNION ALL
          SELECT * FROM recent_jobs
        ) combined
        ORDER BY sort_at DESC
        LIMIT 5
      )
    SELECT
      (SELECT balance_pending FROM job_stats) AS balance_pending,
      (SELECT quotes_pending FROM quote_stats) AS quotes_pending,
      (SELECT active_jobs_week FROM job_stats) AS active_jobs_week,
      (SELECT total_collected FROM payment_stats) AS total_collected,
      (SELECT COALESCE(json_agg(recent), '[]'::json) FROM recent) AS recent_activity
  `;

  const row = rows[0];
  return {
    balancePending: Number(row?.balance_pending ?? 0),
    quotesPending: Number(row?.quotes_pending ?? 0),
    activeJobsWeek: Number(row?.active_jobs_week ?? 0),
    totalCollected: Number(row?.total_collected ?? 0),
    recentActivity: Array.isArray(row?.recent_activity) ? row.recent_activity : [],
  };
}

// 3. Clientes
export async function getCustomers(organizationId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.customer.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomer(organizationId: string, data: CustomerFormData) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.customer.create({
    data: {
      organizationId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      neighborhood: data.neighborhood,
      notes: data.notes || null,
    },
  });
}

// 4. Servicios
export async function getServices(organizationId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.service.findMany({
    where: { organizationId, deletedAt: null },
  });
}

// 5. Presupuestos (Quotes)
export async function getQuotes(organizationId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.quote.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      customer: true,
      items: true,
      job: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuoteByPublicToken(token: string) {
  return await prisma.quote.findUnique({
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
}

export async function createQuote(organizationId: string, input: QuoteCreateInput) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) {
    throw new Error("El cliente seleccionado no pertenece a esta organización");
  }

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

  return await prisma.quote.create({
    data: {
      organizationId,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
}

export async function updateQuoteStatus(
  organizationId: string,
  quoteId: string,
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CONVERTED"
) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  const existing = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Presupuesto no encontrado");
  }
  return await prisma.quote.update({
    where: { id: quoteId },
    data: { status },
  });
}

// 6. Trabajos (Jobs)
export async function getJobs(organizationId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.job.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      customer: true,
      payments: {
        where: { status: "APPROVED" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJobById(organizationId: string, jobId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.job.findFirst({
    where: { id: jobId, organizationId, deletedAt: null },
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
}

export async function updateJobStatus(
  organizationId: string,
  jobId: string,
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }
  const existing = await prisma.job.findFirst({
    where: { id: jobId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Orden de trabajo no encontrada");
  }
  return await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });
}

// 7. Pagos y Cobranzas
export async function recordPayment(
  organizationId: string,
  input: ManualPaymentInput & { mpPaymentId?: string; mpPreferenceId?: string }
) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }

  return await prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: { id: input.jobId, organizationId, deletedAt: null },
    });

    if (!job) throw new Error("Orden de trabajo no encontrada");

    const payment = await tx.payment.create({
      data: {
        organizationId,
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
}

// 8. Convertir Presupuesto a Orden de Trabajo (al aprobarse o pagarse seña)
export async function convertQuoteToJob(organizationId: string, quoteId: string) {
  if (!organizationId) {
    throw new Error("organizationId es obligatorio");
  }

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId, deletedAt: null },
    include: { job: true },
  });

  if (!quote) throw new Error("Presupuesto no encontrado");
  if (quote.job) return quote.job;

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

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "CONVERTED" },
  });

  return newJob;
}

/**
 * Gestión de Usuarios
 */
export async function getUsers(organizationId?: string) {
  const users = await prisma.user.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { organization: true },
  });
  return users.map((u) => ({
    id: u.id,
    authUserId: u.authUserId,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    organizationId: u.organizationId,
    organizationName: u.organization?.name || "ElectroCba",
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: "SUPERADMIN" | "OWNER" | "MEMBER";
  phone?: string;
  organizationId?: string;
  shareCurrentOrg?: boolean;
}) {
  const normalizedEmail = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new Error("Ya existe un usuario registrado con este correo electrónico.");
  }

  // 1. Crear primero en Supabase Auth usando Service Role Key
  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: data.password,
    email_confirm: true,
  });

  if (authError || !authData?.user) {
    throw new Error(
      authError?.message || "No se pudo crear la cuenta en el servicio de autenticación."
    );
  }

  const createdAuthUserId = authData.user.id;

  // 2. Crear en Prisma con compensación automática si falla para no dejar huérfanos en Auth
  try {
    const user = await prisma.$transaction(async (tx) => {
      let assignedOrgId = data.organizationId;
      if (!data.shareCurrentOrg || !assignedOrgId) {
        const newOrg = await tx.organization.create({
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

      return await tx.user.create({
        data: {
          authUserId: createdAuthUserId,
          name: data.name.trim(),
          email: normalizedEmail,
          role: data.role || "OWNER",
          phone: data.phone?.trim(),
          organizationId: assignedOrgId,
        },
        include: { organization: true },
      });
    });

    return {
      id: user.id,
      authUserId: user.authUserId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      createdAt: user.createdAt.toISOString(),
    };
  } catch (dbError) {
    try {
      await getSupabaseAdmin().auth.admin.deleteUser(createdAuthUserId);
    } catch (rollbackError) {
      console.error("[createUser] Error al revertir usuario en Supabase Auth:", rollbackError);
    }
    throw dbError;
  }
}

export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  if (user.authUserId) {
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(user.authUserId);
    if (error) {
      console.error("[deleteUser] Aviso al eliminar usuario de Supabase Auth:", error.message);
    }
  }

  return { success: true };
}
