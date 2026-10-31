import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
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
    signatureUrl?: string | null;
  } | null;
  items?: Array<{
    description?: string | null;
    itemType?: "LABOR" | "MATERIALS" | string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    subtotal?: number | null;
  }> | null;
}

/**
 * Envuelve texto largo en múltiples líneas ajustadas al ancho máximo en puntos PDF
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = (text || "").replace(/\r?\n/g, " ").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

export async function generateQuotePdf(quote: QuoteData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (595.28 x 841.89 pt)
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Paleta Cromática Corporativa Azul (Referencia Oficial)
  const navyPrimary = rgb(15 / 255, 42 / 255, 74 / 255); // #0F2A4A Azul Marino Institucional
  const navyFooter = rgb(11 / 255, 29 / 255, 54 / 255); // #0B1D36 Azul Marino Profundo
  const steelBlue = rgb(29 / 255, 78 / 255, 216 / 255); // #1D4ED8 Azul Acero / Acento
  const accentBlue = rgb(37 / 255, 99 / 255, 235 / 255); // #2563EB Azul Corporativo
  const textCharcoal = rgb(30 / 255, 41 / 255, 59 / 255); // #1E293B Gris Carbón
  const textSlate = rgb(71 / 255, 85 / 255, 105 / 255); // #475569 Gris Pizarra
  const bgCard = rgb(226 / 255, 232 / 255, 240 / 255); // #E2E8F0 Fondo Tarjetas Superiores
  const bgRowAlt = rgb(248 / 255, 250 / 255, 252 / 255); // #F8FAFC Fila Alternada
  const bgClientCard = rgb(241 / 255, 245 / 255, 249 / 255); // #F1F5F9 Caja de Cliente
  const borderLight = rgb(203 / 255, 213 / 255, 225 / 255); // #CBD5E1 Bordes de Tabla
  const white = rgb(1, 1, 1);

  const marginX = 36;
  const contentWidth = width - marginX * 2;
  let cursorY = height - 38;

  const org = quote.organization || {};
  const vatStr = org.vatCondition || org.taxCondition || "Monotributo";
  const addrStr = org.legalAddress || org.address || "Córdoba Capital";
  const phoneVal = org.phone || org.whatsappNumber || "+54 9 351 000-0000";
  const emailVal = org.email || "info@electrocba.com.ar";
  const orgLicense =
    org.ersepLicenseNumber ||
    org.ersepLicense ||
    "Habilitación ERSeP Ley 10.281";

  // ============================================================================
  // 1. CABECERA CORPORATIVA (ISOTIPO AZUL + MARCA + CONTACTO ALINEADO A DERECHA)
  // ============================================================================
  // Isotipo del rayo estilizado vectorial en color azul corporativo
  try {
    const boltPath =
      "M 26 0 L 4 28 L 19 28 L 8 54 L 38 22 L 22 22 Z";
    page.drawSvgPath(boltPath, {
      x: marginX + 4,
      y: cursorY + 4,
      color: steelBlue,
      scale: 0.95,
    });
  } catch {
    // Fallback si drawSvgPath no aplica
    page.drawRectangle({
      x: marginX + 4,
      y: cursorY - 42,
      width: 26,
      height: 42,
      color: steelBlue,
    });
  }

  // Texto "ELECTROCBA" con "ELECTRO" en azul marino y "CBA" en azul acero
  const brandX = marginX + 48;
  const electroText = "ELECTRO";
  const cbaText = "CBA";
  const brandFontSize = 25;

  page.drawText(electroText, {
    x: brandX,
    y: cursorY - 22,
    size: brandFontSize,
    font: fontBold,
    color: navyPrimary,
  });

  const electroWidth = fontBold.widthOfTextAtSize(electroText, brandFontSize);
  page.drawText(cbaText, {
    x: brandX + electroWidth + 1,
    y: cursorY - 22,
    size: brandFontSize,
    font: fontBold,
    color: accentBlue,
  });

  page.drawText("INGENIERÍA  &  SERVICIOS  TÉCNICOS", {
    x: brandX + 1,
    y: cursorY - 36,
    size: 8.2,
    font: fontRegular,
    color: textSlate,
  });

  // Línea vertical separadora en cabecera
  const headerDividerX = width - marginX - 185;
  page.drawLine({
    start: { x: headerDividerX, y: cursorY - 2 },
    end: { x: headerDividerX, y: cursorY - 46 },
    thickness: 0.9,
    color: borderLight,
  });

  // Bloque de contacto a la derecha
  const contactX = headerDividerX + 14;
  page.drawText(`${vatStr} | ${addrStr}`, {
    x: contactX,
    y: cursorY - 11,
    size: 8.5,
    font: fontRegular,
    color: textCharcoal,
  });
  page.drawText("Provincia de Córdoba", {
    x: contactX,
    y: cursorY - 22,
    size: 8.5,
    font: fontRegular,
    color: textCharcoal,
  });
  page.drawText(`Tel: ${phoneVal}`, {
    x: contactX,
    y: cursorY - 35,
    size: 8.5,
    font: fontRegular,
    color: textCharcoal,
  });
  page.drawText(emailVal, {
    x: contactX,
    y: cursorY - 46,
    size: 8.5,
    font: fontRegular,
    color: textCharcoal,
  });

  cursorY -= 58;

  // Línea horizontal separadora azul acero
  page.drawLine({
    start: { x: marginX, y: cursorY },
    end: { x: width - marginX, y: cursorY },
    thickness: 1.5,
    color: navyPrimary,
  });

  cursorY -= 14;

  // ============================================================================
  // 2. SECCIÓN TÍTULO "PRESUPUESTO" Y TARJETA DE FECHAS ADYACENTE
  // ============================================================================
  const safeId = quote.id ? String(quote.id) : "000000";
  const quoteNum =
    quote.quoteNumber ||
    `EC-${new Date().getFullYear()}-${safeId.length >= 3 ? safeId.slice(-3).toUpperCase() : safeId.toUpperCase()}`;

  const createdAtDate = quote.createdAt ? new Date(quote.createdAt) : new Date();
  const validityDays = Number(quote.validityDays) || 15;
  const expirationDate = quote.expiresAt
    ? new Date(quote.expiresAt)
    : new Date(createdAtDate.getTime() + validityDays * 86400000);

  // Lado Izquierdo: PRESUPUESTO + Caja azul marino con N°
  page.drawText("PRESUPUESTO", {
    x: marginX,
    y: cursorY - 18,
    size: 19,
    font: fontBold,
    color: textCharcoal,
  });

  const badgeWidth = 165;
  const badgeHeight = 24;
  page.drawRectangle({
    x: marginX,
    y: cursorY - 48,
    width: badgeWidth,
    height: badgeHeight,
    color: navyPrimary,
  });

  const numLabel = `N° ${quoteNum}`;
  const numLabelWidth = fontBold.widthOfTextAtSize(numLabel, 12.5);
  page.drawText(numLabel, {
    x: marginX + (badgeWidth - numLabelWidth) / 2,
    y: cursorY - 40,
    size: 12.5,
    font: fontBold,
    color: white,
  });

  // Lado Derecho: Tarjeta gris tenue con Emisión y Vencimiento
  const dateCardWidth = 205;
  const dateCardHeight = 52;
  const dateCardX = width - marginX - dateCardWidth;
  const dateCardY = cursorY - 50;

  page.drawRectangle({
    x: dateCardX,
    y: dateCardY,
    width: dateCardWidth,
    height: dateCardHeight,
    color: bgCard,
  });

  // Divisor vertical interno de la tarjeta de fechas
  const midDateX = dateCardX + dateCardWidth / 2;
  page.drawLine({
    start: { x: midDateX, y: dateCardY + 8 },
    end: { x: midDateX, y: dateCardY + dateCardHeight - 8 },
    thickness: 0.8,
    color: textSlate,
  });

  // Columna Emisión
  page.drawText("Emisión", {
    x: dateCardX + 16,
    y: dateCardY + 34,
    size: 8.5,
    font: fontRegular,
    color: textCharcoal,
  });
  page.drawText(formatDate(createdAtDate), {
    x: dateCardX + 16,
    y: dateCardY + 19,
    size: 10.5,
    font: fontBold,
    color: textCharcoal,
  });

  // Columna Vencimiento
  page.drawText("Vencimiento", {
    x: midDateX + 16,
    y: dateCardY + 34,
    size: 8.5,
    font: fontRegular,
    color: textCharcoal,
  });
  page.drawText(formatDate(expirationDate), {
    x: midDateX + 16,
    y: dateCardY + 19,
    size: 10.5,
    font: fontBold,
    color: textCharcoal,
  });
  page.drawText(`(${validityDays} días corridos)`, {
    x: midDateX + 16,
    y: dateCardY + 8,
    size: 7.5,
    font: fontRegular,
    color: textSlate,
  });

  cursorY -= 64;

  // ============================================================================
  // 3. BLOQUE DE CLIENTE Y PROYECTO (CAJA CON BORDE IZQUIERDO AZUL ACERO)
  // ============================================================================
  const cust = quote.customer || {};
  const custName = cust.name || "Comitente General";
  const custAddress = cust.address || "Córdoba Capital";
  const custNeighborhood = cust.neighborhood ? ` (${cust.neighborhood}, Córdoba)` : "";
  const custPhone = cust.phone || "No informado";
  const projectTitle = quote.title || "Instalación y Adecuación Eléctrica";

  const clientBoxHeight = 56;
  const clientBoxY = cursorY - clientBoxHeight;

  page.drawRectangle({
    x: marginX,
    y: clientBoxY,
    width: contentWidth,
    height: clientBoxHeight,
    color: bgClientCard,
  });

  // Barra lateral izquierda en azul marino/acero
  page.drawRectangle({
    x: marginX,
    y: clientBoxY,
    width: 3.5,
    height: clientBoxHeight,
    color: navyPrimary,
  });

  const labelColX = marginX + 16;
  const valColX = marginX + 68;

  page.drawText("Cliente:", {
    x: labelColX,
    y: cursorY - 18,
    size: 9.5,
    font: fontBold,
    color: textCharcoal,
  });
  page.drawText(custName, {
    x: valColX,
    y: cursorY - 18,
    size: 10.5,
    font: fontBold,
    color: textCharcoal,
  });

  // Teléfono alineado a la derecha en la primera fila
  const phoneLabel = `Teléfono: ${custPhone}`;
  const phoneLabelWidth = fontRegular.widthOfTextAtSize(phoneLabel, 9);
  page.drawText(phoneLabel, {
    x: width - marginX - phoneLabelWidth - 16,
    y: cursorY - 18,
    size: 9,
    font: fontRegular,
    color: textCharcoal,
  });

  page.drawText("Domicilio:", {
    x: labelColX,
    y: cursorY - 33,
    size: 9,
    font: fontRegular,
    color: textCharcoal,
  });
  page.drawText(`${custAddress}${custNeighborhood}`, {
    x: valColX,
    y: cursorY - 33,
    size: 9,
    font: fontRegular,
    color: textCharcoal,
  });

  page.drawText("Obra:", {
    x: labelColX,
    y: cursorY - 47,
    size: 9,
    font: fontRegular,
    color: textCharcoal,
  });
  page.drawText(projectTitle, {
    x: valColX,
    y: cursorY - 47,
    size: 9,
    font: fontRegular,
    color: textCharcoal,
  });

  cursorY = clientBoxY - 14;

  // ============================================================================
  // 4. TABLA PRINCIPAL DE ÍTEMS (CABECERA AZUL MARINO + CELDAS CON GRILLA SUTIL)
  // ============================================================================
  // Definición de columnas milimétricas (Total width = 523.28 pt)
  const col = {
    x0: marginX, // 36
    x1: marginX + 266, // 302 (Descripción: 266pt)
    x2: marginX + 346, // 382 (Tipo: 80pt)
    x3: marginX + 388, // 424 (Cant: 42pt)
    x4: marginX + 455, // 491 (Unitario: 67pt)
    x5: width - marginX, // 559.28 (Subtotal: 68.28pt)
  };

  const headerHeight = 22;
  const headerY = cursorY - headerHeight;

  // Fondo cabecera azul marino
  page.drawRectangle({
    x: col.x0,
    y: headerY,
    width: contentWidth,
    height: headerHeight,
    color: navyPrimary,
  });

  // Textos de cabecera
  page.drawText("DESCRIPCIÓN DE LA TAREA O MATERIAL", {
    x: col.x0 + 10,
    y: headerY + 7,
    size: 8,
    font: fontBold,
    color: white,
  });

  const drawCenteredText = (
    txt: string,
    xStart: number,
    xEnd: number,
    yPos: number,
    font: PDFFont,
    size: number,
    color = textCharcoal
  ) => {
    const w = font.widthOfTextAtSize(txt, size);
    page.drawText(txt, {
      x: xStart + (xEnd - xStart - w) / 2,
      y: yPos,
      size,
      font,
      color,
    });
  };

  const drawRightText = (
    txt: string,
    xEnd: number,
    yPos: number,
    font: PDFFont,
    size: number,
    paddingRight = 8,
    color = textCharcoal
  ) => {
    const w = font.widthOfTextAtSize(txt, size);
    page.drawText(txt, {
      x: xEnd - w - paddingRight,
      y: yPos,
      size,
      font,
      color,
    });
  };

  drawCenteredText("TIPO", col.x1, col.x2, headerY + 7, fontBold, 8, white);
  drawCenteredText("CANT.", col.x2, col.x3, headerY + 7, fontBold, 8, white);
  drawCenteredText("UNITARIO", col.x3, col.x4, headerY + 7, fontBold, 8, white);
  drawCenteredText("SUBTOTAL", col.x4, col.x5, headerY + 7, fontBold, 8, white);

  // Líneas verticales en cabecera
  [col.x1, col.x2, col.x3, col.x4].forEach((xPos) => {
    page.drawLine({
      start: { x: xPos, y: headerY },
      end: { x: xPos, y: headerY + headerHeight },
      thickness: 0.6,
      color: rgb(45 / 255, 75 / 255, 115 / 255),
    });
  });

  cursorY = headerY;

  const rawItems = Array.isArray(quote.items) && quote.items.length > 0
    ? quote.items
    : [
        {
          description: "Tareas técnicas según memoria descriptiva reglamentaria",
          itemType: "LABOR",
          quantity: 1,
          unitPrice: Number(quote.totalAmount) || 0,
          subtotal: Number(quote.totalAmount) || 0,
        },
      ];

  // Limitar a máximo 8 filas visibles para mantener diseño A4 limpio de 1 página
  const displayItems = rawItems.slice(0, 8);
  const rowHeight = 21;
  const tableTopY = cursorY;

  displayItems.forEach((item, idx) => {
    const rowY = cursorY - rowHeight;
    const isEven = idx % 2 === 1;

    // Fondo de fila
    page.drawRectangle({
      x: col.x0,
      y: rowY,
      width: contentWidth,
      height: rowHeight,
      color: isEven ? bgRowAlt : bgClientCard,
    });

    // Borde inferior de fila
    page.drawLine({
      start: { x: col.x0, y: rowY },
      end: { x: col.x5, y: rowY },
      thickness: 0.6,
      color: borderLight,
    });

    // Formatear descripción concisa y limpia
    let rawDesc = (item?.description || "Partida presupuestaria").trim();
    // Si tiene una explicación excesivamente larga luego de un punto o paréntesis, resumir para que entre prolijo en la columna
    const maxDescWidth = col.x1 - col.x0 - 16;
    if (fontRegular.widthOfTextAtSize(rawDesc, 8.2) > maxDescWidth) {
      while (rawDesc.length > 10 && fontRegular.widthOfTextAtSize(rawDesc + "...", 8.2) > maxDescWidth) {
        rawDesc = rawDesc.slice(0, -1);
      }
      rawDesc = rawDesc.trim() + "...";
    }

    const typeLabel = item?.itemType === "MATERIALS" ? "Material IRAM" : "Mano de Obra";
    const qty = Number(item?.quantity) || 1;
    const unitPrice = Number(item?.unitPrice) || 0;
    const subtotal = Number(item?.subtotal) || qty * unitPrice;

    const textY = rowY + 6.5;

    page.drawText(rawDesc, {
      x: col.x0 + 10,
      y: textY,
      size: 8.2,
      font: fontRegular,
      color: textCharcoal,
    });

    drawCenteredText(typeLabel, col.x1, col.x2, textY, fontRegular, 8.2, textCharcoal);
    drawCenteredText(String(qty), col.x2, col.x3, textY, fontRegular, 8.2, textCharcoal);
    drawRightText(formatCurrencyARS(unitPrice), col.x4, textY, fontRegular, 8.2, 8, textCharcoal);
    drawRightText(formatCurrencyARS(subtotal), col.x5, textY, fontRegular, 8.2, 8, textCharcoal);

    cursorY = rowY;
  });

  // Bordes verticales de la tabla de ítems
  [col.x0, col.x1, col.x2, col.x3, col.x4, col.x5].forEach((xPos) => {
    page.drawLine({
      start: { x: xPos, y: cursorY },
      end: { x: xPos, y: tableTopY },
      thickness: 0.6,
      color: borderLight,
    });
  });

  cursorY -= 12;

  // ============================================================================
  // 5. RECUADRO DESTACADO DE TOTALES A LA DERECHA
  // ============================================================================
  const totalAmount = Number(quote.totalAmount) || 0;
  const depositPercent = Number(quote.depositPercentage) || 50;
  const depositAmount = Math.round((totalAmount * depositPercent) / 100);
  const remainingAmount = totalAmount - depositAmount;

  const totalsBoxX = col.x1; // Alineado con el inicio de la columna TIPO (ancho ~257pt)
  const totalsBoxWidth = col.x5 - totalsBoxX;
  const totalBannerHeight = 25;
  const totalBannerY = cursorY - totalBannerHeight;

  // Banner superior azul marino: TOTAL PRESUPUESTADO
  page.drawRectangle({
    x: totalsBoxX,
    y: totalBannerY,
    width: totalsBoxWidth,
    height: totalBannerHeight,
    color: navyPrimary,
  });

  page.drawText("TOTAL PRESUPUESTADO", {
    x: totalsBoxX + 12,
    y: totalBannerY + 8,
    size: 9.5,
    font: fontBold,
    color: white,
  });

  drawRightText(
    formatCurrencyARS(totalAmount),
    col.x5,
    totalBannerY + 7,
    fontBold,
    13,
    12,
    white
  );

  // Sub-caja gris inferior con Seña requerida y Saldo contra conformidad
  const subTotalsHeight = 38;
  const subTotalsY = totalBannerY - subTotalsHeight;

  page.drawRectangle({
    x: totalsBoxX,
    y: subTotalsY,
    width: totalsBoxWidth,
    height: subTotalsHeight,
    color: bgCard,
  });

  page.drawText(`Seña requerida (${depositPercent}%):`, {
    x: totalsBoxX + 12,
    y: subTotalsY + 22,
    size: 8.8,
    font: fontRegular,
    color: textCharcoal,
  });
  drawRightText(
    formatCurrencyARS(depositAmount),
    col.x5,
    subTotalsY + 22,
    fontRegular,
    9,
    12,
    textCharcoal
  );

  page.drawText("Saldo contra conformidad:", {
    x: totalsBoxX + 12,
    y: subTotalsY + 8,
    size: 8.8,
    font: fontRegular,
    color: textCharcoal,
  });
  drawRightText(
    formatCurrencyARS(remainingAmount),
    col.x5,
    subTotalsY + 8,
    fontRegular,
    9,
    12,
    textCharcoal
  );

  cursorY = subTotalsY - 20;

  // ============================================================================
  // 6. CONDICIONES CONTRACTUALES Y CLÁUSULAS LEGALES
  // ============================================================================
  // Barra vertical azul + título + línea horizontal
  page.drawRectangle({
    x: marginX,
    y: cursorY - 1,
    width: 2.2,
    height: 11,
    color: steelBlue,
  });

  const legalTitle = "CONDICIONES CONTRACTUALES Y CLÁUSULAS LEGALES";
  page.drawText(legalTitle, {
    x: marginX + 8,
    y: cursorY,
    size: 9.5,
    font: fontBold,
    color: navyPrimary,
  });

  const titleWidth = fontBold.widthOfTextAtSize(legalTitle, 9.5);
  page.drawLine({
    start: { x: marginX + titleWidth + 18, y: cursorY + 3.5 },
    end: { x: width - marginX, y: cursorY + 3.5 },
    thickness: 0.9,
    color: navyPrimary,
  });

  cursorY -= 16;

  const bankAlias = org.bankAlias || org.aliasCbu || "ELECTROCBA.MP";
  const clauses = [
    {
      num: "1.",
      boldPrefix: "MARCO NORMATIVO:",
      body: `Tareas ejecutadas bajo la Ley de Seguridad Eléctrica de la Pcia. de Córdoba N° 10.281 (${orgLicense}) y reglamentación vigente.`,
    },
    {
      num: "2.",
      boldPrefix: "GARANTÍA LEGAL ESCRITA:",
      body: "Conforme a la Ley Nacional de Defensa del Consumidor N° 24.240 (Arts. 11 y 21), se otorga garantía escrita por seis (6) meses sobre la mano de obra y componentes instalados.",
    },
    {
      num: "3.",
      boldPrefix: "VIGENCIA Y ANTI-INFLACIÓN:",
      body: `Cotización firme hasta el ${formatDate(expirationDate)} (${validityDays} días corridos). Ajustes posteriores aplicarán si la lista oficial de distribuidoras de materiales eléctricos supera el 10% de variación.`,
    },
    {
      num: "4.",
      boldPrefix: "PLAN DE PAGO:",
      body: `Seña del ${depositPercent}% para reserva de fecha y materiales; saldo del ${100 - depositPercent}% restante contra recepción y conformidad de obra.`,
    },
    {
      num: "5.",
      boldPrefix: "MEDIOS HABILITADOS:",
      body: `Transferencia bancaria (Alias: ${bankAlias}), Mercado Pago Oficial o Efectivo con recibo fiscal.`,
    },
  ];

  const clauseNumX = marginX + 8;
  const clauseTextX = marginX + 26;
  const maxClauseWidth = contentWidth - 34;

  for (const clause of clauses) {
    page.drawText(clause.num, {
      x: clauseNumX,
      y: cursorY,
      size: 8,
      font: fontBold,
      color: navyPrimary,
    });

    // Medir prefijo en negrita
    const prefixStr = `${clause.boldPrefix} `;
    const prefixWidth = fontBold.widthOfTextAtSize(prefixStr, 8);

    page.drawText(prefixStr, {
      x: clauseTextX,
      y: cursorY,
      size: 8,
      font: fontBold,
      color: textCharcoal,
    });

    // Envolver el resto del texto considerando el espacio ocupado por el prefijo en la primera línea
    const words = clause.body.split(/\s+/);
    let line1 = "";
    let restIdx = 0;
    const firstLineMaxWidth = maxClauseWidth - prefixWidth;

    for (let i = 0; i < words.length; i++) {
      const candidate = line1 ? `${line1} ${words[i]}` : words[i];
      if (fontRegular.widthOfTextAtSize(candidate, 8) <= firstLineMaxWidth) {
        line1 = candidate;
        restIdx = i + 1;
      } else {
        break;
      }
    }

    page.drawText(line1, {
      x: clauseTextX + prefixWidth,
      y: cursorY,
      size: 8,
      font: fontRegular,
      color: textCharcoal,
    });

    const remainingWords = words.slice(restIdx).join(" ");
    if (remainingWords) {
      const extraLines = wrapText(remainingWords, fontRegular, 8, maxClauseWidth);
      for (const extra of extraLines) {
        cursorY -= 10.5;
        page.drawText(extra, {
          x: clauseTextX,
          y: cursorY,
          size: 8,
          font: fontRegular,
          color: textCharcoal,
        });
      }
    }

    cursorY -= 14;
  }

  // ============================================================================
  // 7. PIE DE PÁGINA, FIRMA DIGITAL (O LÍNEA DE PUNTOS) Y FRANJA INSTITUCIONAL
  // ============================================================================
  const footerBannerHeight = 32;
  const signatureSectionY = footerBannerHeight + 52; // ~84pt desde el borde inferior

  // Línea horizontal separadora superior al bloque de firma
  page.drawLine({
    start: { x: marginX, y: signatureSectionY + 42 },
    end: { x: width - marginX, y: signatureSectionY + 42 },
    thickness: 1.1,
    color: navyPrimary,
  });

  // Lema institucional a la izquierda con línea horizontal contigua
  const mottoText = "Compromiso, calidad y seguridad en cada proyecto.";
  page.drawText(mottoText, {
    x: marginX,
    y: signatureSectionY + 12,
    size: 10.5,
    font: fontRegular,
    color: textCharcoal,
  });

  const mottoWidth = fontRegular.widthOfTextAtSize(mottoText, 10.5);
  page.drawLine({
    start: { x: marginX + mottoWidth + 8, y: signatureSectionY + 14 },
    end: { x: marginX + mottoWidth + 86, y: signatureSectionY + 14 },
    thickness: 0.7,
    color: textSlate,
  });

  // Bloque de Firma a la derecha
  const sigCenterX = width - marginX - 75;
  const sigLineY = signatureSectionY + 8;

  let signatureEmbedded = false;
  if (org.signatureUrl && org.signatureUrl.startsWith("data:image/")) {
    try {
      const base64Data = org.signatureUrl.split(",")[1];
      if (base64Data) {
        const sigBytes = Buffer.from(base64Data, "base64");
        const sigImg = org.signatureUrl.includes("image/png")
          ? await pdfDoc.embedPng(sigBytes)
          : await pdfDoc.embedJpg(sigBytes);

        const maxSigW = 125;
        const maxSigH = 38;
        const scale = Math.min(maxSigW / sigImg.width, maxSigH / sigImg.height, 1);
        const drawW = sigImg.width * scale;
        const drawH = sigImg.height * scale;

        page.drawImage(sigImg, {
          x: sigCenterX - drawW / 2,
          y: sigLineY + 2,
          width: drawW,
          height: drawH,
        });
        signatureEmbedded = true;
      }
    } catch (sigErr) {
      console.warn("[PDF Generator] Aviso al incrustar firma digital:", sigErr);
    }
  }

  if (!signatureEmbedded) {
    // Si no hay firma digital guardada, dibujar línea punteada para firma ológrafa física
    const dotStartX = sigCenterX - 65;
    const dotEndX = sigCenterX + 65;
    for (let x = dotStartX; x < dotEndX; x += 4) {
      page.drawLine({
        start: { x, y: sigLineY + 2 },
        end: { x: x + 2, y: sigLineY + 2 },
        thickness: 0.8,
        color: textSlate,
      });
    }
  } else {
    // Línea continua sutil debajo de la firma digital estampada
    page.drawLine({
      start: { x: sigCenterX - 65, y: sigLineY },
      end: { x: sigCenterX + 65, y: sigLineY },
      thickness: 0.7,
      color: textSlate,
    });
  }

  const signerTitle = "Electrocba";
  const signerSubtitle = "Ingeniería & Servicios Técnicos";
  const signerTitleW = fontBold.widthOfTextAtSize(signerTitle, 9.5);
  const signerSubW = fontRegular.widthOfTextAtSize(signerSubtitle, 7.2);

  page.drawText(signerTitle, {
    x: sigCenterX - signerTitleW / 2,
    y: sigLineY - 10,
    size: 9.5,
    font: fontBold,
    color: textCharcoal,
  });

  page.drawText(signerSubtitle, {
    x: sigCenterX - signerSubW / 2,
    y: sigLineY - 19,
    size: 7.2,
    font: fontRegular,
    color: textSlate,
  });

  // Franja inferior completa en azul marino con detalles diagonales y texto en blanco
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: footerBannerHeight,
    color: navyFooter,
  });

  // Acento geométrico diagonal en esquina inferior izquierda
  try {
    page.drawSvgPath("M 0 0 L 65 0 L 90 36 L 0 36 Z", {
      x: 0,
      y: 36,
      color: navyPrimary,
    });
    page.drawSvgPath("M 42 0 L 50 0 L 75 36 L 67 36 Z", {
      x: 0,
      y: 36,
      color: white,
    });
    page.drawSvgPath("M 56 0 L 64 0 L 89 36 L 81 36 Z", {
      x: 0,
      y: 36,
      color: white,
    });
  } catch {}

  const footerText =
    "Empresa habilitada por ERSeP   |   Trabajo certificado bajo normas IRAM   |   Córdoba, Argentina";
  const footerTextW = fontRegular.widthOfTextAtSize(footerText, 8.2);
  page.drawText(footerText, {
    x: (width - footerTextW) / 2 + 18,
    y: 12,
    size: 8.2,
    font: fontRegular,
    color: rgb(226 / 255, 232 / 255, 240 / 255),
  });

  return await pdfDoc.save();
}
