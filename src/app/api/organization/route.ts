import { NextRequest, NextResponse } from "next/server";
import { getOrganization, updateOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { organizationSettingsSchema } from "@/lib/types";

export async function GET() {
  try {
    const session = await getSession();
    const org = await getOrganization(session?.organizationId);
    return NextResponse.json({
      success: true,
      organization: {
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
        mpAccessToken: org.mpAccessToken || "",
        mpPublicKey: org.mpPublicKey || "",
        logoUrl: org.logoUrl || "",
        email: org.email || "",
      },
    });
  } catch (error) {
    console.error("Error al obtener organización:", error);
    return NextResponse.json(
      { error: "Error al recuperar datos de la organización", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
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

    const session = await getSession();
    const currentOrg = await getOrganization(session?.organizationId);
    const updated = await updateOrganization(currentOrg.id, parsed.data);

    return NextResponse.json({
      success: true,
      message: "Configuración guardada exitosamente",
      organization: updated,
    });
  } catch (error) {
    console.error("Error al actualizar organización:", error);
    return NextResponse.json(
      { error: "Error interno al guardar configuración", details: String(error) },
      { status: 500 }
    );
  }
}
