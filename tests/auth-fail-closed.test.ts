import { describe, it, expect, vi } from "vitest";

// Mock de prisma para simular autenticación y perfiles
vi.mock("@/lib/db", () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(async ({ where }) => {
          if (where.authUserId === "auth_user_valid") {
            return {
              id: "usr_1",
              authUserId: "auth_user_valid",
              name: "Dueño de Prueba",
              email: "owner@electrocba.com.ar",
              role: "OWNER",
              organizationId: "org_1",
              organization: {
                name: "ElectroCba Test",
                ersepLicenseNumber: "Cat III - 14892",
              },
            };
          }
          if (where.authUserId === "auth_user_unlinked") {
            // Usuario en Supabase Auth pero sin fila User / Organization en Prisma
            return null;
          }
          return null;
        }),
      },
    },
  };
});

// Mock de createClient de Supabase Server
const mockSignOut = vi.fn(async () => ({ error: null }));
let currentAuthUser: { id: string; email: string } | null = null;

vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: vi.fn(async () => ({
      auth: {
        getUser: vi.fn(async () => {
          if (!currentAuthUser) {
            return { data: { user: null }, error: new Error("No session") };
          }
          return { data: { user: currentAuthUser }, error: null };
        }),
        signOut: mockSignOut,
      },
    })),
  };
});

import { getSession, requireSession, UnauthorizedError, ForbiddenError } from "../src/lib/auth";

describe("Fail-closed Authentication and Session Guards", () => {
  it("getSession devuelve null si no hay sesión en Supabase Auth", async () => {
    currentAuthUser = null;
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("requireSession lanza UnauthorizedError (401) si no hay sesión", async () => {
    currentAuthUser = null;
    await expect(requireSession()).rejects.toThrow(UnauthorizedError);
  });

  it("cierra sesión huérfana y lanza ForbiddenError (403) si el usuario en Auth no tiene fila en Prisma", async () => {
    currentAuthUser = { id: "auth_user_unlinked", email: "unlinked@electrocba.com.ar" };
    mockSignOut.mockClear();

    await expect(requireSession()).rejects.toThrow(ForbiddenError);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("retorna SessionUser válido cuando Auth y Prisma están vinculados", async () => {
    currentAuthUser = { id: "auth_user_valid", email: "owner@electrocba.com.ar" };
    const session = await requireSession();

    expect(session).not.toBeNull();
    expect(session.userId).toBe("usr_1");
    expect(session.organizationId).toBe("org_1");
    expect(session.role).toBe("OWNER");
  });
});
