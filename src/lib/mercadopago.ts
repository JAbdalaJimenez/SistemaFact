import "server-only";
import { MercadoPagoConfig, Preference } from "mercadopago";
import crypto from "crypto";
import { env, publicEnv } from "./env";
import { decryptSecret, signExternalReference } from "./crypto";
import { formatCurrencyARS, formatPhoneForWhatsApp } from "./types";

export interface CreatePreferenceParams {
  title: string;
  amount: number;
  organizationId: string;
  accessToken?: string | null;
  quoteId?: string;
  jobId?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface PreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
  shortUrl: string;
}

export interface MercadoPagoPaymentInfo {
  id: string;
  status: string;
  transaction_amount: number;
  external_reference: string | null;
}

/**
 * Genera una preferencia de pago oficial en Mercado Pago con external_reference firmado con HMAC.
 */
export async function createPreference(
  params: CreatePreferenceParams
): Promise<PreferenceResult> {
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  const decryptedOrgToken = decryptSecret(params.accessToken);
  const tokenToUse = decryptedOrgToken || env.MERCADO_PAGO_ACCESS_TOKEN || "";

  const signedExternalReference = signExternalReference({
    organizationId: params.organizationId,
    jobId: params.jobId,
    quoteId: params.quoteId,
    expectedAmount: Math.round(Number(params.amount)),
  });

  if (
    tokenToUse &&
    !tokenToUse.includes("mock") &&
    !tokenToUse.includes("CHANGE_ME") &&
    !tokenToUse.includes("your-access-token")
  ) {
    const activeClient = new MercadoPagoConfig({
      accessToken: tokenToUse,
      options: { timeout: 7000 },
    });
    const preference = new Preference(activeClient);
    const res = await preference.create({
      body: {
        items: [
          {
            id: params.jobId || params.quoteId || "item-electrocba",
            title: params.title,
            description: `Servicio técnico electricista (${params.title})`,
            unit_price: Math.round(Number(params.amount)),
            quantity: 1,
            currency_id: "ARS",
          },
        ],
        payer: {
          name: params.customerName || "Cliente",
          email: params.customerEmail || "cliente@electrocba.com.ar",
        },
        back_urls: {
          success: `${baseUrl}/payments/status?status=approved&jobId=${params.jobId || ""}&quoteId=${params.quoteId || ""}`,
          failure: `${baseUrl}/payments/status?status=failure&jobId=${params.jobId || ""}&quoteId=${params.quoteId || ""}`,
          pending: `${baseUrl}/payments/status?status=pending&jobId=${params.jobId || ""}&quoteId=${params.quoteId || ""}`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/payments/webhook?orgId=${encodeURIComponent(params.organizationId)}`,
        external_reference: signedExternalReference,
        statement_descriptor: "ELECTROCBA",
        payment_methods: {
          excluded_payment_types: [],
          installments: 12,
        },
      },
    });

    if (!res.id || !res.init_point) {
      throw new Error("Mercado Pago no devolvió una URL de pago válida.");
    }

    return {
      id: res.id,
      initPoint: res.init_point,
      sandboxInitPoint: res.sandbox_init_point || res.init_point,
      shortUrl: res.init_point,
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "La organización no tiene configurado un Access Token válido de Mercado Pago."
    );
  }

  // Solo en entorno local de desarrollo (bloqueado en producción):
  const mockId = `MP-${Math.floor(100000000 + Math.random() * 900000000)}`;
  const checkoutUrl = `${baseUrl}/payments/checkout-mock?pref_id=${mockId}&jobId=${params.jobId || ""}&quoteId=${params.quoteId || ""}&amount=${params.amount}&title=${encodeURIComponent(params.title)}`;

  return {
    id: mockId,
    initPoint: checkoutUrl,
    sandboxInitPoint: checkoutUrl,
    shortUrl: checkoutUrl,
  };
}

/**
 * Consulta un pago directamente en la API oficial de Mercado Pago (`GET /v1/payments/{id}`).
 * Nunca se confía en los datos enviados en el body del webhook.
 */
export async function fetchPaymentFromMercadoPago(
  paymentId: string,
  accessToken: string
): Promise<MercadoPagoPaymentInfo> {
  const token = decryptSecret(accessToken) || env.MERCADO_PAGO_ACCESS_TOKEN || "";
  if (!token) {
    throw new Error("Access Token de Mercado Pago no disponible para verificar el pago.");
  }

  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Mercado Pago API respondió con estado ${res.status}`);
  }

  const data = await res.json();
  return {
    id: String(data.id),
    status: String(data.status || ""),
    transaction_amount: Number(data.transaction_amount || 0),
    external_reference:
      typeof data.external_reference === "string" ? data.external_reference : null,
  };
}

/**
 * Valida la firma HMAC-SHA256 del Webhook de Mercado Pago en tiempo constante.
 * Falla cerrado: si falta el secreto, los headers o el dataId, devuelve `false`.
 */
export function verifyMercadoPagoSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null | undefined
): boolean {
  const secret = env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret || secret === "CHANGE_ME" || secret === "test_webhook_secret_key") {
    return false;
  }

  if (!xSignature || !xRequestId || !dataId) {
    return false;
  }

  try {
    const parts = xSignature.split(",");
    let ts = "";
    let hash = "";

    for (const part of parts) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key === "ts") ts = value;
      if (key === "v1") hash = value;
    }

    if (!ts || !hash) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const computedHash = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(computedHash, "hex");
    if (a.length === 0 || a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Genera el enlace de WhatsApp preconfigurado con mensaje profesional dinámico
 */
export function generateWhatsAppLink({
  phone,
  customerName,
  title,
  amount,
  paymentUrl,
  type = "job_balance",
  publicToken,
  organizationName = "ElectroCba",
  electricianName = "Instalador Electricista",
  ersepLicense = "Matrícula Habilitada ERSeP",
}: {
  phone: string;
  customerName: string;
  title: string;
  amount: number;
  paymentUrl?: string;
  type?: "quote" | "quote_deposit" | "job_balance";
  publicToken?: string;
  organizationName?: string;
  electricianName?: string;
  ersepLicense?: string;
}): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const formattedAmount = formatCurrencyARS(amount);
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;

  let message = "";

  if (type === "quote" && publicToken) {
    const quoteUrl = `${baseUrl}/p/${publicToken}`;
    message = `Estimado/a ${customerName}:\n\nLe saluda ${electricianName} de ${organizationName} (${ersepLicense}).\n\nLe comparto el detalle formal del presupuesto para su obra: *${title}* por un total de *${formattedAmount}*.\n\nPuede revisar la ficha técnica reglamentaria y confirmar el anticipo en el siguiente enlace oficial:\n${quoteUrl}\n\nQuedo a su disposición ante cualquier requerimiento normativo.`;
  } else if (type === "quote_deposit" && paymentUrl) {
    message = `Estimado/a ${customerName}:\n\n${electricianName} de ${organizationName}.\n\nPara confirmar la fecha de inicio de obra (*${title}*), puede abonar la seña formal (*${formattedAmount}*) de forma segura por Mercado Pago:\n${paymentUrl}\n\nUna vez acreditada se confirmará el ingreso en el cronograma técnico de obra.`;
  } else if (paymentUrl) {
    message = `Estimado/a ${customerName}:\n\n${electricianName} de ${organizationName}.\n\nLe remito el enlace oficial para cancelar el saldo contractual restante de *${formattedAmount}* correspondiente a la obra: *${title}*:\n${paymentUrl}\n\nPuede abonar mediante transferencia, tarjeta de débito/crédito o dinero en cuenta.`;
  } else {
    message = `Estimado/a ${customerName}:\n\nLe saluda ${electricianName} de ${organizationName}. Me contacto con referencia a los servicios técnicos solicitados. ¿En qué franja horaria le resulta conveniente coordinar el relevamiento técnico en obra?`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
