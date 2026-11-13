import { describe, it, expect, vi } from "vitest";

// Mock de prisma para simular aislamiento multi-tenant en servicios
vi.mock("@/lib/db", () => {
  return {
    default: {
      job: {
        findFirst: vi.fn(async ({ where }) => {
          // Si el organizationId no coincide con la organización dueña del job, retorna null
          if (where.organizationId === "org_owner_1" && where.id === "job_100") {
            return { id: "job_100", organizationId: "org_owner_1", balanceDue: 50000, status: "IN_PROGRESS" };
          }
          return null;
        }),
        update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
      },
      quote: {
        findFirst: vi.fn(async ({ where }) => {
          if (where.organizationId === "org_owner_1" && where.id === "quote_200") {
            return { id: "quote_200", organizationId: "org_owner_1", status: "SENT" };
          }
          return null;
        }),
        update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
      },
      payment: {
        create: vi.fn(async ({ data }) => ({ id: "pay_1", ...data })),
      },
      $transaction: vi.fn(async (cb) => {
        const tx = {
          job: {
            findFirst: vi.fn(async ({ where }) => {
              if (where.organizationId === "org_owner_1" && where.id === "job_100") {
                return { id: "job_100", organizationId: "org_owner_1", balanceDue: 50000, status: "IN_PROGRESS" };
              }
              return null;
            }),
            update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
          },
          payment: {
            create: vi.fn(async ({ data }) => ({ id: "pay_1", ...data })),
          },
        };
        return await cb(tx);
      }),
    },
  };
});

import { getJobById, updateQuoteStatus, recordPayment } from "../src/lib/services";

describe("Aislamiento Multi-Tenant en Servicios", () => {
  it("impide que una organización acceda al Job de otra organización", async () => {
    // Org dueña: org_owner_1
    const allowed = await getJobById("org_owner_1", "job_100");
    expect(allowed).not.toBeNull();
    expect(allowed?.id).toBe("job_100");

    // Org atacante / distinta: org_attacker_2
    const blocked = await getJobById("org_attacker_2", "job_100");
    expect(blocked).toBeNull();
  });

  it("impide que una organización modifique el estado de cotización de otra", async () => {
    // Org distinta no encuentra la cotización y lanza error
    await expect(
      updateQuoteStatus("org_attacker_2", "quote_200", "APPROVED")
    ).rejects.toThrow("Presupuesto no encontrado");
  });

  it("impide registrar pagos sobre órdenes de otra organización", async () => {
    await expect(
      recordPayment("org_attacker_2", {
        jobId: "job_100",
        amount: 25000,
        paymentMethod: "CASH",
      })
    ).rejects.toThrow("Orden de trabajo no encontrada");
  });
});

