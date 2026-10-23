import { z } from "zod";

// Validaciones con Zod
export const customerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z
    .string()
    .min(8, "Número de teléfono inválido")
    .regex(/^[+0-9\s-]+$/, "Solo números, espacios y signos + o -"),
  address: z.string().min(3, "La dirección es obligatoria"),
  neighborhood: z.string().min(2, "Indique el barrio de Córdoba"),
  notes: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const quoteItemSchema = z.object({
  description: z.string().min(3, "La descripción del ítem es requerida"),
  itemType: z.enum(["LABOR", "MATERIALS"]).default("LABOR"),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.number().int().nonnegative("El precio unitario no puede ser negativo"),
});

export const quoteCreateSchema = z.object({
  customerId: z.string().min(1, "Debe seleccionar un cliente"),
  title: z.string().min(3, "El título del presupuesto es obligatorio"),
  depositPercentage: z.number().int().min(0).max(100).default(50),
  validityDays: z.number().int().min(1).max(90).default(10),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "Debe agregar al menos un ítem al presupuesto"),
});

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

export const STANDARD_LEGAL_CLAUSES = `1. MARCO NORMATIVO: Tareas ejecutadas bajo la Ley de Seguridad Eléctrica de la Provincia de Córdoba N° 10.281 y reglamentación AEA 90364.
2. GARANTÍA LEGAL ESCRITA: Conforme a la Ley Nacional de Defensa del Consumidor N° 24.240 (Arts. 11 y 21), se otorga garantía escrita por seis (6) meses sobre la mano de obra y componentes instalados.
3. CONDICIÓN ANTI-INFLACIÓN Y VIGENCIA: Precios firmes por el plazo de validez. Ajustes posteriores aplicarán exclusivamente si la lista oficial de distribuidoras de materiales supera el 10% de variación.
4. CONDICIONES DE PAGO: Seña del 50% para reserva de fecha y acopio de materiales. Saldo del 50% restante contra recepción y conformidad de obra.
5. MEDIOS HABILITADOS: Transferencia (Alias: ELECTROCBA.MP), Mercado Pago (tarjetas/dinero en cuenta) o Efectivo con recibo.`;

export const manualPaymentSchema = z.object({
  jobId: z.string().min(1, "JobId requerido"),
  amount: z.number().int().positive("El monto debe ser mayor a 0"),
  paymentMethod: z.enum(["CASH", "TRANSFER", "MERCADO_PAGO"]),
  notes: z.string().optional(),
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
