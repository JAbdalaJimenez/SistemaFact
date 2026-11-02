import prisma from "./db";
import { CustomerFormData, QuoteCreateInput, ManualPaymentInput } from "./types";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

// 1. Obtener Organización
export async function getOrganization(orgId?: string) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }
  const found = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!found) {
    throw new Error("Organización no encontrada");
  }
  return found;
}

export async function updateOrganization(
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Partial<any>
) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }

  return await prisma.organization.update({
    where: { id: orgId },
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
      mpAccessToken: data.mpAccessToken,
      mpPublicKey: data.mpPublicKey,
      logoUrl: data.logoUrl,
      signatureUrl: data.signatureUrl,
      email: data.email,
    },
  });
}

// 2. Métricas del Dashboard Operativo
export async function getDashboardMetrics(orgId?: string) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }

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
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return {
    balancePending,
    quotesPending,
    activeJobsWeek,
    totalCollected,
    recentActivity,
  };
}

// 3. Clientes
export async function getCustomers(orgId?: string) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.customer.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomer(orgId: string, data: CustomerFormData) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }
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
}

// 4. Servicios
export async function getServices(orgId?: string) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.service.findMany({
    where: { organizationId: orgId, deletedAt: null },
  });
}

// 5. Presupuestos (Quotes)
export async function getQuotes(orgId?: string) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }
  return await prisma.quote.findMany({
    where: { organizationId: orgId, deletedAt: null },
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

export async function createQuote(orgId: string, input: QuoteCreateInput) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
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
  quoteId: string,
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "CONVERTED"
) {
  return await prisma.quote.update({
    where: { id: quoteId },
    data: { status },
  });
}

// 6. Trabajos (Jobs)
export async function getJobs(orgId?: string) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }
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
}

export async function getJobById(jobId: string) {
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
}

export async function updateJobStatus(
  jobId: string,
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
) {
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
  orgId: string,
  input: ManualPaymentInput & { mpPaymentId?: string; mpPreferenceId?: string }
) {
  if (!orgId) {
    throw new Error("organizationId es obligatorio");
  }

  return await prisma.$transaction(async (tx) => {
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
}

// 8. Convertir Presupuesto a Orden de Trabajo (al aprobarse o pagarse seña)
export async function convertQuoteToJob(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
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
export async function getUsers() {
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
  const hashedPassword = bcrypt.hashSync(data.password, 10);

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new Error("Ya existe un usuario registrado con este correo electrónico.");
  }

  let assignedOrgId = data.organizationId;
  if (!data.shareCurrentOrg || !assignedOrgId) {
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
      role: data.role || "OWNER",
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
}

export async function deleteUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });
  return { success: true };
}
