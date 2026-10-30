import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatCurrencyARS, formatDate } from "./types";
import fs from "fs";
import path from "path";

export interface QuoteData {
  id?: string | null;
  quoteNumber?: string | null;
  title?: string | null;
  createdAt?: Date | string | null;
  validityDays?: number | null;
  expiresAt?: Date | string | null;
  totalAmount?: number | null;
  depositPercentage?: number | null;
  notes?: string | null;
  publicToken?: string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    neighborhood?: string | null;
  } | null;
  organization?: {
    name?: string | null;
    legalName?: string | null;
    ersepLicenseNumber?: string | null;
    ersepLicense?: string | null;
    cuit?: string | null;
    vatCondition?: string | null;
    taxCondition?: string | null;
    legalAddress?: string | null;
    address?: string | null;
    phone?: string | null;
    whatsappNumber?: string | null;
    email?: string | null;
    bankAlias?: string | null;
    cbuCvu?: string | null;
    aliasCbu?: string | null;
  } | null;
  items?: Array<{
    description?: string | null;
    itemType?: "LABOR" | "MATERIALS" | string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    subtotal?: number | null;
  }> | null;
}

export async function generateQuotePdf(quote: QuoteData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Paleta de colores oficial ElectroCba
  const primaryBlue = rgb(30 / 255, 64 / 255, 175 / 255); // #1E40AF
  const successGreen = rgb(21 / 255, 128 / 255, 61 / 255); // #15803D
  const textDark = rgb(15 / 255, 23 / 255, 42 / 255);
  const textMuted = rgb(100 / 255, 116 / 255, 139 / 255);
  const bgLight = rgb(248 / 255, 250 / 255, 252 / 255);
  const borderGray = rgb(226 / 255, 232 / 255, 240 / 255);

  const marginX = 40;
  let cursorY = height - 40;

  // Cargar logotipo oficial de forma segura
  let logoImage = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-full.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    }
  } catch {
    // fallback silencioso
  }

  // 1. CABECERA SUPERIOR Y MEMBRETE ERSEP
  page.drawRectangle({
    x: marginX,
    y: cursorY - 60,
    width: width - marginX * 2,
    height: 65,
    color: rgb(15 / 255, 23 / 255, 42 / 255), // #0F172A Deep Obsidian
  });

  // Franja decorativa dorada superior
  page.drawRectangle({
    x: marginX,
    y: cursorY + 4,
    width: width - marginX * 2,
    height: 2,
    color: rgb(197 / 255, 160 / 255, 89 / 255), // #C5A059 Warm Gold
  });

  if (logoImage) {
    try {
      const logoDims = logoImage.scale(0.28);
      page.drawImage(logoImage, {
        x: width - marginX - logoDims.width - 12,
        y: cursorY - 50,
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch {}
  }

  const org = quote.organization || {};
  const orgName = org.name || "ElectroCba - Soluciones Eléctricas";
  const orgLicense =
    org.ersepLicenseNumber ||
    org.ersepLicense ||
    "Matrícula Habilitada ERSeP";
  const cuitStr = org.cuit ? ` • CUIT: ${org.cuit}` : "";
  const vatStr = org.vatCondition || org.taxCondition || "Monotributo";
  const addrStr = org.legalAddress || org.address || "Córdoba Capital";
  const phoneVal = org.phone || org.whatsappNumber || "";
  const phoneStr = phoneVal ? ` | Tel: ${phoneVal}` : "";

  page.drawText(orgName, {
    x: marginX + 15,
    y: cursorY - 25,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`${orgLicense}${cuitStr}`, {
    x: marginX + 15,
    y: cursorY - 42,
    size: 9,
    font: fontBold,
    color: rgb(187 / 255, 247 / 255, 208 / 255), // light green
  });

  page.drawText(`${vatStr} | ${addrStr}${phoneStr}`, {
    x: marginX + 15,
    y: cursorY - 55,
    size: 8,
    font: fontRegular,
    color: rgb(219 / 255, 234 / 255, 254 / 255),
  });

  cursorY -= 80;

  // 2. TÍTULO DEL COMPROBANTE Y NÚMERO FORMAL (Protegido contra IDs nulos)
  const safeId = quote.id ? String(quote.id) : "000000";
  const quoteNum =
    quote.quoteNumber ||
    `EC-${safeId.length >= 6 ? safeId.slice(-6).toUpperCase() : safeId.toUpperCase()}`;

  const createdAtDate = quote.createdAt ? new Date(quote.createdAt) : new Date();
  const validityDays = Number(quote.validityDays) || 15;
  const expirationDate = quote.expiresAt
    ? new Date(quote.expiresAt)
    : new Date(createdAtDate.getTime() + validityDays * 86400000);

  page.drawText(`PRESUPUESTO FORMAL: ${quoteNum}`, {
    x: marginX,
    y: cursorY,
    size: 13,
    font: fontBold,
    color: primaryBlue,
  });

  page.drawText(
    `Emisión: ${formatDate(createdAtDate)} | Vence: ${formatDate(expirationDate)} (${validityDays} días corridos)`,
    {
      x: width - marginX - 260,
      y: cursorY,
      size: 8.5,
      font: fontRegular,
      color: textMuted,
    }
  );

  cursorY -= 20;

  // 3. TARJETA DE DATOS DEL CLIENTE Y TRABAJO (Protegido contra customer nulo)
  const cust = quote.customer || {};
  const custName = cust.name || "Comitente General";
  const custAddress = cust.address || "Córdoba Capital";
  const custNeighborhood = cust.neighborhood ? ` (${cust.neighborhood}, Córdoba)` : " (Córdoba)";
  const custPhone = cust.phone || "No informado";

  page.drawRectangle({
    x: marginX,
    y: cursorY - 45,
    width: width - marginX * 2,
    height: 48,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 1,
  });

  page.drawText(`Cliente: ${custName}`, {
    x: marginX + 10,
    y: cursorY - 15,
    size: 10,
    font: fontBold,
    color: textDark,
  });

  page.drawText(`Domicilio: ${custAddress}${custNeighborhood}`, {
    x: marginX + 10,
    y: cursorY - 28,
    size: 9,
    font: fontRegular,
    color: textMuted,
  });

  page.drawText(`Obra: ${quote.title || "Instalación Eléctrica General"}`, {
    x: marginX + 10,
    y: cursorY - 40,
    size: 9,
    font: fontBold,
    color: primaryBlue,
  });

  page.drawText(`Teléfono: ${custPhone}`, {
    x: width - marginX - 160,
    y: cursorY - 15,
    size: 9,
    font: fontRegular,
    color: textMuted,
  });

  cursorY -= 65;

  // 4. TABLA DE ÍTEMS (Protegido contra items vacíos o nulos)
  const colX = {
    desc: marginX + 8,
    type: marginX + 270,
    qty: marginX + 355,
    unit: marginX + 400,
    subtotal: marginX + 465,
  };

  // Cabecera de la tabla
  page.drawRectangle({
    x: marginX,
    y: cursorY - 14,
    width: width - marginX * 2,
    height: 18,
    color: primaryBlue,
  });

  page.drawText("DESCRIPCIÓN DE LA TAREA O MATERIAL", {
    x: colX.desc,
    y: cursorY - 9,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("TIPO", {
    x: colX.type,
    y: cursorY - 9,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("CANT", {
    x: colX.qty,
    y: cursorY - 9,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("UNITARIO", {
    x: colX.unit,
    y: cursorY - 9,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("SUBTOTAL", {
    x: colX.subtotal,
    y: cursorY - 9,
    size: 8,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  cursorY -= 20;

  // Filas de ítems
  const items = Array.isArray(quote.items) ? quote.items : [];

  if (items.length === 0) {
    page.drawText("Tareas según memoria descriptiva y especificaciones técnicas generales.", {
      x: colX.desc,
      y: cursorY - 9,
      size: 8,
      font: fontRegular,
      color: textDark,
    });
    cursorY -= 17;
  } else {
    items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        page.drawRectangle({
          x: marginX,
          y: cursorY - 14,
          width: width - marginX * 2,
          height: 17,
          color: rgb(241 / 255, 245 / 255, 249 / 255),
        });
      }

      const typeLabel = item?.itemType === "MATERIALS" ? "Material IRAM" : "Mano de Obra";
      const desc = item?.description || "Partida presupuestaria";
      const truncatedDesc = desc.length > 46 ? desc.slice(0, 44) + "..." : desc;
      const qty = Number(item?.quantity) || 1;
      const unitPrice = Number(item?.unitPrice) || 0;
      const subtotal = Number(item?.subtotal) || qty * unitPrice;

      page.drawText(truncatedDesc, {
        x: colX.desc,
        y: cursorY - 9,
        size: 8,
        font: fontRegular,
        color: textDark,
      });
      page.drawText(typeLabel, {
        x: colX.type,
        y: cursorY - 9,
        size: 7.5,
        font: fontBold,
        color: item?.itemType === "MATERIALS" ? successGreen : primaryBlue,
      });
      page.drawText(String(qty), {
        x: colX.qty + 6,
        y: cursorY - 9,
        size: 8,
        font: fontRegular,
        color: textDark,
      });
      page.drawText(formatCurrencyARS(unitPrice), {
        x: colX.unit,
        y: cursorY - 9,
        size: 8,
        font: fontRegular,
        color: textDark,
      });
      page.drawText(formatCurrencyARS(subtotal), {
        x: colX.subtotal,
        y: cursorY - 9,
        size: 8,
        font: fontBold,
        color: textDark,
      });

      cursorY -= 17;
    });
  }

  cursorY -= 15;

  // 5. CAJA DE TOTALES Y CONDICIONES DE PAGO
  const totalAmount = Number(quote.totalAmount) || 0;
  const depositPercent = Number(quote.depositPercentage) || 50;
  const depositAmount = Math.round((totalAmount * depositPercent) / 100);
  const remainingAmount = totalAmount - depositAmount;

  page.drawRectangle({
    x: width - marginX - 220,
    y: cursorY - 55,
    width: 220,
    height: 60,
    color: bgLight,
    borderColor: primaryBlue,
    borderWidth: 1,
  });

  page.drawText("TOTAL PRESUPUESTADO:", {
    x: width - marginX - 210,
    y: cursorY - 16,
    size: 10,
    font: fontBold,
    color: primaryBlue,
  });
  page.drawText(formatCurrencyARS(totalAmount), {
    x: width - marginX - 80,
    y: cursorY - 16,
    size: 11,
    font: fontBold,
    color: primaryBlue,
  });

  page.drawText(`Seña requerida (${depositPercent}%):`, {
    x: width - marginX - 210,
    y: cursorY - 32,
    size: 9,
    font: fontBold,
    color: successGreen,
  });
  page.drawText(formatCurrencyARS(depositAmount), {
    x: width - marginX - 80,
    y: cursorY - 32,
    size: 9,
    font: fontBold,
    color: successGreen,
  });

  page.drawText("Saldo contra conformidad:", {
    x: width - marginX - 210,
    y: cursorY - 48,
    size: 8.5,
    font: fontRegular,
    color: textMuted,
  });
  page.drawText(formatCurrencyARS(remainingAmount), {
    x: width - marginX - 80,
    y: cursorY - 48,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });

  cursorY -= 75;

  // 6. CLÁUSULAS LEGALES CONTRACTUALES (CÓRDOBA Y ARGENTINA)
  page.drawRectangle({
    x: marginX,
    y: cursorY - 110,
    width: width - marginX * 2,
    height: 115,
    color: rgb(254 / 255, 252 / 255, 232 / 255), // light amber
    borderColor: rgb(253 / 255, 230 / 255, 138 / 255),
    borderWidth: 1,
  });

  page.drawText("CONDICIONES CONTRACTUALES Y CLÁUSULAS LEGALES:", {
    x: marginX + 10,
    y: cursorY - 14,
    size: 8.5,
    font: fontBold,
    color: rgb(180 / 255, 83 / 255, 9 / 255), // amber-700
  });

  const bankAlias = org.bankAlias || org.aliasCbu;
  const cbuCvu = org.cbuCvu;
  const bankDetails = bankAlias ? `Alias: ${bankAlias}` : (cbuCvu ? `CBU/CVU: ${cbuCvu}` : "Transferencia directa");

  const legalLines = [
    `1. MARCO NORMATIVO: Tareas ejecutadas bajo la Ley de Seguridad Eléctrica de la Pcia. de Córdoba N° 10.281 (${orgLicense}) y reglamentación AEA 90364.`,
    "2. GARANTÍA LEGAL ESCRITA: Conforme a la Ley Nacional de Defensa del Consumidor N° 24.240 (Arts. 11 y 21), se otorga garantía",
    "    escrita por seis (6) meses sobre la mano de obra y componentes instalados.",
    `3. VIGENCIA Y ANTI-INFLACIÓN: Cotización firme hasta el ${formatDate(expirationDate)} (${validityDays} días corridos). Ajustes posteriores`,
    "    aplicarán si la lista oficial de distribuidoras de materiales eléctricos supera el 10% de variación.",
    `4. PLAN DE PAGO: Seña del ${depositPercent}% para reserva de fecha y materiales; saldo del ${100 - depositPercent}% restante contra recepción y conformidad de obra.`,
    `5. MEDIOS HABILITADOS: Transferencia bancaria (${bankDetails}), Mercado Pago Oficial o Efectivo con recibo fiscal.`,
  ];

  legalLines.forEach((line, idx) => {
    page.drawText(line, {
      x: marginX + 10,
      y: cursorY - 28 - idx * 12,
      size: 7.5,
      font: fontRegular,
      color: textDark,
    });
  });

  cursorY -= 135;

  // 7. FIRMA Y PIE DE PÁGINA
  page.drawLine({
    start: { x: width - marginX - 180, y: cursorY },
    end: { x: width - marginX, y: cursorY },
    thickness: 1,
    color: textMuted,
  });

  const signerName = org.legalName || org.name || "Instalador Habilitado";
  page.drawText(signerName, {
    x: width - marginX - 160,
    y: cursorY - 12,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  page.drawText(orgLicense, {
    x: width - marginX - 175,
    y: cursorY - 23,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  return await pdfDoc.save();
}
