import "dotenv/config";
import { z } from "zod";

// Validaciones con Zod y límites estrictos para prevenir DoS / payloads desmedidos
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder los 100 caracteres"),
  phone: z
    .string()
    .trim()
    .min(8, "Número de teléfono inválido")
    .max(25, "El teléfono no puede exceder los 25 caracteres")
    .regex(/^[+0-9\s-]+$/, "Solo números, espacios y signos + o -"),
  address: z
    .string()
    .trim()
    .min(3, "La dirección es obligatoria")
    .max(150, "La dirección no puede exceder los 150 caracteres"),
  neighborhood: z
    .string()
    .trim()
    .min(2, "Indique el barrio de Córdoba")
    .max(80, "El barrio no puede exceder los 80 caracteres"),
  notes: z
    .string()
    .trim()
    .max(1000, "Las notas no pueden exceder los 1000 caracteres")
    .optional()
    .nullable(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const quoteItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(3, "La descripción del ítem es requerida")
    .max(250, "La descripción no puede exceder los 250 caracteres"),
  itemType: z.enum(["LABOR", "MATERIALS"]).default("LABOR"),
  quantity: z
    .number()
    .int()
    .positive("La cantidad debe ser mayor a 0")
    .max(10000, "La cantidad no puede superar las 10.000 unidades"),
  unitPrice: z
    .number()
    .int()
    .nonnegative("El precio unitario no puede ser negativo")
    .max(100000000, "El precio unitario excede el límite permitido"),
});

export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre comercial debe tener al menos 2 caracteres")
    .max(100, "El nombre comercial no puede exceder los 100 caracteres"),
  legalName: z
    .string()
    .trim()
    .min(2, "La razón social o nombre y apellido es obligatorio")
    .max(120, "La razón social no puede exceder los 120 caracteres"),
  ersepLicenseNumber: z
    .string()
    .trim()
    .min(3, "La matrícula habilitante ERSeP con categoría es obligatoria")
    .max(80, "La matrícula no puede exceder los 80 caracteres"),
  cuit: z
    .string()
    .trim()
    .min(10, "El CUIT ante ARCA/AFIP es obligatorio")
    .max(20, "El CUIT no puede exceder los 20 caracteres"),
  vatCondition: z
    .string()
    .trim()
    .min(2, "La condición frente al IVA es obligatoria")
    .max(50, "La condición IVA no puede exceder los 50 caracteres"),
  legalAddress: z
    .string()
    .trim()
    .min(3, "El domicilio legal en Córdoba es obligatorio")
    .max(150, "El domicilio legal no puede exceder los 150 caracteres"),
  phone: z
    .string()
    .trim()
    .min(6, "El teléfono de contacto es obligatorio")
    .max(25, "El teléfono no puede exceder los 25 caracteres"),
  whatsappNumber: z
    .string()
    .trim()
    .max(25, "El número de WhatsApp no puede exceder los 25 caracteres")
    .optional()
    .nullable(),
  bankAlias: z
    .string()
    .trim()
    .max(30, "El alias bancario no puede exceder los 30 caracteres")
    .optional()
    .nullable(),
  cbuCvu: z
    .string()
    .trim()
    .max(22, "El CBU/CVU debe tener como máximo 22 caracteres")
    .optional()
    .nullable(),
  mpAccessToken: z
    .string()
    .trim()
    .max(250, "El token de Mercado Pago excede el tamaño permitido")
    .optional()
    .nullable(),
  mpPublicKey: z
    .string()
    .trim()
    .max(250, "La clave pública de Mercado Pago excede el tamaño permitido")
    .optional()
    .nullable(),
  mpWebhookSecret: z
    .string()
    .trim()
    .max(250, "El secreto de webhook excede el tamaño permitido")
    .optional()
    .nullable(),
  logoUrl: z
    .string()
    .trim()
    .max(500, "La URL del logo no puede exceder los 500 caracteres")
    .optional()
    .nullable(),
  signatureUrl: z
    .string()
    .trim()
    .max(200000, "La firma digital en base64 excede el tamaño máximo permitido (200KB)")
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(100, "El correo electrónico no puede exceder los 100 caracteres")
    .or(z.literal(""))
    .optional()
    .nullable(),
});

export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;

export const quoteCreateSchema = z.object({
  customerId: z.string().min(1, "Debe seleccionar un cliente").max(50),
  title: z
    .string()
    .trim()
    .min(3, "El título del presupuesto es obligatorio")
    .max(150, "El título no puede exceder los 150 caracteres"),
  depositPercentage: z.number().int().min(0).max(100).default(50),
  validityDays: z.number().int().min(1).max(90).default(15),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z
    .string()
    .trim()
    .max(3000, "Las notas y cláusulas no pueden exceder los 3000 caracteres")
    .optional()
    .nullable(),
  items: z
    .array(quoteItemSchema)
    .min(1, "Debe agregar al menos un ítem al presupuesto")
    .max(100, "Un presupuesto no puede tener más de 100 ítems"),
});

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

export function getDynamicLegalClauses(params?: {
  organization?: {
    name?: string | null;
    legalName?: string | null;
    ersepLicenseNumber?: string | null;
    ersepLicense?: string | null;
    bankAlias?: string | null;
    aliasCbu?: string | null;
  };
  validityDays?: number;
  depositPercentage?: number;
}): string {
  const license =
    params?.organization?.ersepLicenseNumber ||
    params?.organization?.ersepLicense ||
    "Matrícula Habilitante ERSeP";
  const alias =
    params?.organization?.bankAlias ||
    params?.organization?.aliasCbu ||
    "Alias a convenir";
  const validity = params?.validityDays || 15;
  const deposit = params?.depositPercentage || 50;
  const remaining = 100 - deposit;

  return `1. MARCO NORMATIVO: Tareas ejecutadas bajo la Ley de Seguridad Eléctrica de la Provincia de Córdoba N° 10.281 (${license}) y reglamentación AEA 90364.
2. GARANTÍA LEGAL ESCRITA: Conforme a la Ley Nacional de Defensa del Consumidor N° 24.240 (Arts. 11 y 21), se otorga garantía escrita por seis (6) meses sobre la mano de obra y componentes instalados.
3. CONDICIÓN ANTI-INFLACIÓN Y VIGENCIA: Precios firmes por ${validity} días corridos desde la emisión. Ajustes posteriores aplicarán exclusivamente si la lista oficial de distribuidoras de materiales supera el 10% de variación.
4. CONDICIONES DE PAGO: Seña del ${deposit}% para reserva de fecha y acopio de materiales. Saldo del ${remaining}% restante contra recepción y conformidad de obra.
5. MEDIOS HABILITADOS: Transferencia bancaria directa (Alias: ${alias}), Mercado Pago Checkout Oficial (tarjetas/dinero en cuenta) o Efectivo con recibo fiscal.`;
}

export const STANDARD_LEGAL_CLAUSES = getDynamicLegalClauses();

export const manualPaymentSchema = z.object({
  jobId: z.string().min(1, "JobId requerido").max(50),
  amount: z.coerce
    .number()
    .positive("El monto debe ser mayor a 0")
    .max(1000000000, "El monto supera el límite permitido")
    .transform((v) => Math.round(v)),
  paymentMethod: z.enum(["CASH", "TRANSFER", "MERCADO_PAGO"]),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas de pago no pueden exceder los 500 caracteres")
    .optional()
    .nullable(),
});

export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>;

// Lista predefinida de barrios populares de Córdoba Capital para autocompletar
export const CORDOBA_NEIGHBORHOODS = [
  "Nueva Córdoba",
  "General Paz",
  "Alta Córdoba",
  "Centro",
  "Cerro de las Rosas",
  "Alberdi",
  "Barrio Jardín",
  "Urca",
  "Villa Belgrano",
  "Cofico",
  "San Vicente",
  "Alto Alberdi",
  "Villa Cabrera",
  "Poeta Lugones",
  "Argüello",
  "Güemes",
  "Observatorio",
  "Crisol Sur",
  "Manantiales",
  "Valle Escondido",
];

// Helper determinista para formatear moneda en ARS sin discrepancias de espacios entre Node y Browser
export function formatCurrencyARS(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "$ 0";
  const num = Math.round(Number(amount));
  const parts = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${parts}`;
}

// Helper determinista para formatear fechas DD/MM/AAAA sin discrepancias de timezone o locale entre SSR y cliente
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

// Helper para formatear teléfonos para WhatsApp internacional (+54 9 351 ...)
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Si ya empieza con 549
  if (digits.startsWith("549")) return digits;
  // Si empieza con 54
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  // Si empieza con 0351 o 351
  if (digits.startsWith("0")) {
    return `549${digits.slice(1)}`;
  }
  return `549${digits}`;
}
