import prisma from "./db";
import { getOrganization } from "./services";
import { decryptSecret } from "./crypto";

export interface SanitizedPublicQuote {
  id: string;
  publicToken: string;
  quoteNumber: string;
  title: string;
  status: string;
  depositPercentage: number;
  validityDays: number;
  totalAmount: number;
  notes: string | null;
  createdAt: Date;
  customer: {
    name: string;
    phone: string;
    address: string;
    neighborhood: string;
  };
  organization: {
    name: string;
    legalName: string | null;
    ersepLicenseNumber: string | null;
    ersepLicense: string | null;
    cuit: string | null;
    vatCondition: string | null;
    legalAddress: string | null;
    phone: string;
    whatsappNumber: string | null;
    bankAlias: string | null;
    cbuCvu: string | null;
    logoUrl: string | null;
  };
  items: Array<{
    id: string;
    description: string;
    itemType: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  isPaid: boolean;
}

/**
 * Obtiene y sanitiza un presupuesto público por su publicToken.
 * NUNCA expone secretos ni campos sensibles (mpAccessToken, mpWebhookSecret, deletedAt, etc.).
 */
export async function getSanitizedPublicQuote(token: string): Promise<SanitizedPublicQuote | null> {
  if (!token || typeof token !== "string" || token.length < 8) {
    return null;
  }

  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      publicToken: true,
      quoteNumber: true,
      title: true,
      status: true,
      depositPercentage: true,
      validityDays: true,
      totalAmount: true,
      notes: true,
      createdAt: true,
      deletedAt: true,
      customer: {
        select: {
          name: true,
          phone: true,
          address: true,
          neighborhood: true,
        },
      },
      organization: {
        select: {
          name: true,
          legalName: true,
          ersepLicenseNumber: true,
          ersepLicense: true,
          cuit: true,
          vatCondition: true,
          legalAddress: true,
          address: true,
          phone: true,
          whatsappNumber: true,
          bankAlias: true,
          aliasCbu: true,
          cbuCvu: true,
          logoUrl: true,
        },
      },
      items: {
        select: {
          id: true,
          description: true,
          itemType: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
      job: {
        select: {
          id: true,
          payments: {
            where: { status: "APPROVED" },
            select: { id: true, amount: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!quote || quote.deletedAt !== null) {
    return null;
  }

  const isPaid =
    quote.status === "APPROVED" ||
    quote.status === "CONVERTED" ||
    Boolean(quote.job?.payments && quote.job.payments.length > 0);

  return {
    id: quote.id,
    publicToken: quote.publicToken,
    quoteNumber: quote.quoteNumber || `EC-${quote.id.slice(-6).toUpperCase()}`,
    title: quote.title || "Presupuesto de Trabajo Eléctrico",
    status: quote.status,
    depositPercentage: quote.depositPercentage,
    validityDays: quote.validityDays,
    totalAmount: quote.totalAmount,
    notes: quote.notes,
    createdAt: quote.createdAt,
    customer: {
      name: quote.customer?.name || "Comitente",
      phone: quote.customer?.phone || "",
      address: quote.customer?.address || "Domicilio en obra",
      neighborhood: quote.customer?.neighborhood || "Córdoba",
    },
    organization: {
      name: quote.organization?.name || "ElectroCba",
      legalName: quote.organization?.legalName || quote.organization?.name || null,
      ersepLicenseNumber:
        quote.organization?.ersepLicenseNumber ||
        quote.organization?.ersepLicense ||
        "Matrícula Habilitada ERSeP",
      ersepLicense: quote.organization?.ersepLicense || null,
      cuit: quote.organization?.cuit || "No informado",
      vatCondition: quote.organization?.vatCondition || "Monotributo",
      legalAddress: quote.organization?.legalAddress || quote.organization?.address || "Córdoba Capital",
      phone: quote.organization?.phone || "+54 9 351 000-0000",
      whatsappNumber: quote.organization?.whatsappNumber || null,
      bankAlias: quote.organization?.bankAlias || quote.organization?.aliasCbu || null,
      cbuCvu: quote.organization?.cbuCvu || null,
      logoUrl: quote.organization?.logoUrl || "/logo-icon.png",
    },
    items: quote.items || [],
    isPaid,
  };
}

