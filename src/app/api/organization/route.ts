import { NextRequest, NextResponse } from "next/server";
import { getOrganization, updateOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { organizationSettingsSchema } from "@/lib/types";
import { maskSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function sanitizeOrganizationResponse(org: Awaited<ReturnType<typeof getOrganization>>) {
  return {
    id: org.id,
    name: org.name || "ElectroCba",
    slug: org.slug || "electrocba",
    legalName: org.legalName || org.name || "",
    ersepLicenseNumber: org.ersepLicenseNumber || org.ersepLicense || "",
    cuit: org.cuit || "",
    vatCondition: org.vatCondition || org.taxCondition || "Monotributo",
    legalAddress: org.legalAddress || org.address || "",
    phone: org.phone || "",
    whatsappNumber: org.whatsappNumber || org.phone || "",
    bankAlias: org.bankAlias || org.aliasCbu || "",
    cbuCvu: org.cbuCvu || "",
    mpConfigured: Boolean(org.mpAccessToken),
    mpAccessTokenMasked: maskSecret(org.mpAccessToken),
    mpPublicKey: org.mpPublicKey || "",
    logoUrl: org.logoUrl || "/logo-icon.png",
    signatureUrl: org.signatureUrl || "",
    email: org.email || "",
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const org = await getOrganization(session.organizationId);

    return NextResponse.json(
      {
        success: true,
        organization: sanitizeOrganizationResponse(org),
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Error al obtener organización:", error);
    return NextResponse.json(
      { error: "Error al obtener la configuración de la organización" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.role !== "OWNER" && session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Solo el titular de la organización puede modificar estos ajustes." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = organizationSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos de configuración inválidos",
          issues: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const updated = await updateOrganization(session.organizationId, parsed.data);

    return NextResponse.json({
      success: true,
      message: "Configuración guardada exitosamente",
      organization: sanitizeOrganizationResponse(updated),
    });
  } catch (error) {
    console.error("Error al actualizar organización:", error);
    return NextResponse.json(
      { error: "Error interno al guardar configuración" },
      { status: 500 }
    );
  }
}
