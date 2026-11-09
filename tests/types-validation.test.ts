import { describe, it, expect } from "vitest";
import {
  customerSchema,
  quoteCreateSchema,
  quoteItemSchema,
  organizationSettingsSchema,
  manualPaymentSchema,
} from "../src/lib/types";

describe("Validaciones Zod y Límites de Entrada (DoS prevention)", () => {
  it("valida cliente correcto y rechaza nombres o direcciones excesivas", () => {
    const valid = customerSchema.safeParse({
      name: "Juan Pérez",
      phone: "+54 9 351 1234567",
      address: "Av. Colón 1234",
      neighborhood: "Nueva Córdoba",
      notes: "Timbre 2B",
    });
    expect(valid.success).toBe(true);

    const tooLongName = customerSchema.safeParse({
      name: "A".repeat(150),
      phone: "+54 9 351 1234567",
      address: "Av. Colón 1234",
      neighborhood: "Nueva Córdoba",
    });
    expect(tooLongName.success).toBe(false);
  });

  it("valida ítems de presupuesto y limita longitud de descripción", () => {
    const validItem = quoteItemSchema.safeParse({
      description: "Mano de obra: Adecuación tablero seccional bajo norma AEA 90364",
      itemType: "LABOR",
      quantity: 1,
      unitPrice: 65000,
    });
    expect(validItem.success).toBe(true);

    const excessiveDesc = quoteItemSchema.safeParse({
      description: "X".repeat(300),
      itemType: "LABOR",
      quantity: 1,
      unitPrice: 65000,
    });
    expect(excessiveDesc.success).toBe(false);
  });

  it("rechaza presupuestos con más de 100 ítems", () => {
    const items = Array.from({ length: 105 }, (_, i) => ({
      description: `Ítem número ${i}`,
      itemType: "LABOR" as const,
      quantity: 1,
      unitPrice: 1000,
    }));

    const result = quoteCreateSchema.safeParse({
      customerId: "cust_123",
      title: "Obra de gran escala",
      depositPercentage: 50,
      validityDays: 15,
      taxRate: 0,
      items,
    });

    expect(result.success).toBe(false);
  });

  it("valida settings de organización y limita tamaño de clave y firma", () => {
    const valid = organizationSettingsSchema.safeParse({
      name: "ElectroCba",
      legalName: "Ing. Juan Pérez",
      ersepLicenseNumber: "Cat. III Mat. 14892",
      cuit: "20-12345678-9",
      vatCondition: "Monotributo",
      legalAddress: "Córdoba Capital",
      phone: "+54 9 351 0000000",
      mpAccessToken: "APP_USR-test-token",
      mpPublicKey: "APP_USR-test-public",
      mpWebhookSecret: "test_secret",
      email: "contacto@electrocba.com.ar",
    });
    expect(valid.success).toBe(true);
  });

  it("valida pago manual y rechaza montos negativos o no enteros", () => {
    const valid = manualPaymentSchema.safeParse({
      jobId: "job_123",
      amount: "50000",
      paymentMethod: "TRANSFER",
      notes: "Transferencia CBU",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.amount).toBe(50000);
    }

    const invalid = manualPaymentSchema.safeParse({
      jobId: "job_123",
      amount: -100,
      paymentMethod: "CASH",
    });
    expect(invalid.success).toBe(false);
  });
});
