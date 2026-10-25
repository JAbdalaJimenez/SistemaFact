import { NextRequest, NextResponse } from "next/server";
import { getOrganization, updateOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { organizationSettingsSchema } from "@/lib/types";

const DEFAULT_ORG_ID = "org_electrocba_cba01";

export async function GET() {
  try {
    const session = await getSession();
    const targetOrgId = session?.organizationId || DEFAULT_ORG_ID;
    const org = await getOrganization(targetOrgId);

    const safeOrg = org || {
      id: targetOrgId,
      name: "ElectroCba - Soluciones Eléctricas",
      slug: "electrocba",
      legalName: "Instalador Electricista Habilitado",
      ersepLicenseNumber: "Habilitación ERSeP Ley 10.281",
      ersepLicense: "Habilitación ERSeP Ley 10.281",
      cuit: "20-00000000-0",
      vatCondition: "Monotributo",
      taxCondition: "Monotributo - Prestador de Servicios",
      legalAddress: "Córdoba Capital, Provincia de Córdoba",
      address: "Córdoba Capital, Provincia de Córdoba",
      phone: "+54 9 351 000-0000",
      whatsappNumber: "+5493510000000",
      bankAlias: "ELECTROCBA.MP",
      cbuCvu: "0000003100010000000000",
      aliasCbu: "ELECTROCBA.MP",
      mpAccessToken: "",
      mpPublicKey: "",
      logoUrl: "/logo-icon.png",
      email: "contacto@electrocba.com.ar",
    };

    return NextResponse.json({
      success: true,
      organization: {
        id: safeOrg.id,
        name: safeOrg.name || "ElectroCba",
        slug: safeOrg.slug || "electrocba",
        legalName: safeOrg.legalName || safeOrg.name || "",
        ersepLicenseNumber: safeOrg.ersepLicenseNumber || (safeOrg as any).ersepLicense || "",
        cuit: safeOrg.cuit || "",
        vatCondition: safeOrg.vatCondition || (safeOrg as any).taxCondition || "Monotributo",
        legalAddress: safeOrg.legalAddress || (safeOrg as any).address || "",
        phone: safeOrg.phone || "",
        whatsappNumber: safeOrg.whatsappNumber || safeOrg.phone || "",
        bankAlias: safeOrg.bankAlias || (safeOrg as any).aliasCbu || "",
        cbuCvu: safeOrg.cbuCvu || "",
        mpAccessToken: safeOrg.mpAccessToken || "",
        mpPublicKey: safeOrg.mpPublicKey || "",
        logoUrl: safeOrg.logoUrl || "/logo-icon.png",
        email: safeOrg.email || "",
      },
    });
  } catch (error) {
    console.error("Error al obtener organización:", error);
    return NextResponse.json({
      success: true,
      organization: {
        id: DEFAULT_ORG_ID,
        name: "ElectroCba - Soluciones Eléctricas",
        slug: "electrocba",
        legalName: "Instalador Electricista Habilitado",
        ersepLicenseNumber: "Habilitación ERSeP Ley 10.281",
        cuit: "20-00000000-0",
        vatCondition: "Monotributo",
        legalAddress: "Córdoba Capital, Provincia de Córdoba",
        phone: "+54 9 351 000-0000",
        whatsappNumber: "+5493510000000",
        bankAlias: "ELECTROCBA.MP",
        cbuCvu: "0000003100010000000000",
        mpAccessToken: "",
        mpPublicKey: "",
        logoUrl: "/logo-icon.png",
        email: "contacto@electrocba.com.ar",
      },
    });
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
    const targetOrgId = session?.organizationId || DEFAULT_ORG_ID;
    const currentOrg = await getOrganization(targetOrgId);
    const orgId = currentOrg?.id || targetOrgId;
    const updated = await updateOrganization(orgId, parsed.data);

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
