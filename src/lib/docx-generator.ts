import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Packer,
  ShadingType,
} from "docx";
import { formatCurrencyARS, formatDate } from "./types";

interface QuoteData {
  id: string;
  quoteNumber?: string | null;
  title?: string | null;
  createdAt: Date | string;
  validityDays?: number;
  expiresAt?: Date | string | null;
  totalAmount: number;
  depositPercentage?: number;
  notes?: string | null;
  publicToken: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    neighborhood: string;
  };
  organization: {
    name: string;
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
  };
  items: Array<{
    description: string;
    itemType?: "LABOR" | "MATERIALS";
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export async function generateQuoteDocx(quote: QuoteData): Promise<Buffer> {
  const quoteNum = quote.quoteNumber || `EC-${quote.id.slice(-6).toUpperCase()}`;
  const depositPercent = quote.depositPercentage || 50;
  const depositAmount = Math.round((quote.totalAmount * depositPercent) / 100);
  const remainingAmount = quote.totalAmount - depositAmount;

  const laborItems = quote.items.filter((i) => i.itemType !== "MATERIALS");
  const materialItems = quote.items.filter((i) => i.itemType === "MATERIALS");

  const laborSubtotal = laborItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const materialsSubtotal = materialItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Helper para celdas de tabla
  const createCell = (text: string, options: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bg?: string; width?: number } = {}) => {
    return new TableCell({
      width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
      shading: options.bg ? { fill: options.bg, type: ShadingType.CLEAR } : undefined,
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({
          alignment: options.align || AlignmentType.LEFT,
          children: [
            new TextRun({
              text,
              bold: options.bold || false,
              size: 20, // 10pt
              font: "Arial",
            }),
          ],
        }),
      ],
    });
  };

  const createItemRows = (items: typeof quote.items) => {
    return items.map(
      (item) =>
        new TableRow({
          children: [
            createCell(item.description, { width: 55 }),
            createCell(item.quantity.toString(), { align: AlignmentType.CENTER, width: 15 }),
            createCell(formatCurrencyARS(item.unitPrice), { align: AlignmentType.RIGHT, width: 15 }),
            createCell(formatCurrencyARS(item.subtotal), { align: AlignmentType.RIGHT, bold: true, width: 15 }),
          ],
        })
    );
  };

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      createCell("DESCRIPCIÓN DE TAREAS / COMPONENTES", { bold: true, bg: "1E40AF", width: 55 }),
      createCell("CANT.", { bold: true, align: AlignmentType.CENTER, bg: "1E40AF", width: 15 }),
      createCell("UNITARIO", { bold: true, align: AlignmentType.RIGHT, bg: "1E40AF", width: 15 }),
      createCell("SUBTOTAL", { bold: true, align: AlignmentType.RIGHT, bg: "1E40AF", width: 15 }),
    ],
  });

  const orgName = quote.organization.name || "ElectroCba - Soluciones Eléctricas";
  const orgLicense =
    quote.organization.ersepLicenseNumber ||
    quote.organization.ersepLicense ||
    "Matrícula Habilitada ERSeP";
  const cuitText = quote.organization.cuit ? ` • CUIT: ${quote.organization.cuit}` : "";
  const vatText =
    quote.organization.vatCondition ||
    quote.organization.taxCondition ||
    "Monotributo - Prestador de Servicios";
  const addressText =
    quote.organization.legalAddress || quote.organization.address || "Córdoba Capital";
  const phoneVal = quote.organization.phone || quote.organization.whatsappNumber || "";
  const phoneText = phoneVal ? ` | Tel: ${phoneVal}` : "";

  const createdAtDate = new Date(quote.createdAt);
  const validityDays = quote.validityDays || 15;
  const expirationDate = quote.expiresAt
    ? new Date(quote.expiresAt)
    : new Date(createdAtDate.getTime() + validityDays * 86400000);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch
          },
        },
        children: [
          // MEMBRETE PRINCIPAL
          new Paragraph({
            children: [
              new TextRun({
                text: orgName,
                bold: true,
                size: 32, // 16pt
                color: "1E40AF",
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${orgLicense}${cuitText}`,
                bold: true,
                size: 20,
                color: "15803D",
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Condición Fiscal: ${vatText} | Domicilio Legal: ${addressText}${phoneText}`,
                size: 18,
                color: "64748B",
                font: "Arial",
              }),
            ],
            spacing: { after: 240 },
          }),

          // LÍNEA DIVISORIA
          new Paragraph({
            text: "_________________________________________________________________________________",
            spacing: { after: 240 },
          }),

          // TÍTULO Y DATOS DEL PRESUPUESTO
          new Paragraph({
            children: [
              new TextRun({
                text: `PRESUPUESTO FORMAL N° ${quoteNum}`,
                bold: true,
                size: 26,
                color: "1E40AF",
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Obra / Tarea: ${quote.title || "Instalación y Adecuación Eléctrica"}`,
                bold: true,
                size: 22,
                font: "Arial",
              }),
            ],
            spacing: { after: 180 },
          }),

          // DATOS DEL CLIENTE
          new Paragraph({
            children: [
              new TextRun({ text: "CLIENTE: ", bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: `${quote.customer.name}`, size: 20, font: "Arial" }),
              new TextRun({ text: "   |   UBICACIÓN: ", bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: `${quote.customer.address} (${quote.customer.neighborhood}, Córdoba)`, size: 20, font: "Arial" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CONTACTO: ", bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: `${quote.customer.phone}`, size: 20, font: "Arial" }),
              new TextRun({ text: "   |   EMISIÓN: ", bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: `${formatDate(createdAtDate)}`, size: 20, font: "Arial" }),
              new TextRun({ text: `   |   VENCE: `, bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: `${formatDate(expirationDate)} (${validityDays} días corridos)`, size: 20, font: "Arial" }),
            ],
            spacing: { after: 360 },
          }),

          // SECCIÓN 1: MANO DE OBRA ESPECIALIZADA
          new Paragraph({
            children: [
              new TextRun({
                text: "1. MANO DE OBRA ESPECIALIZADA (Matriculado ERSeP)",
                bold: true,
                size: 22,
                color: "1E40AF",
                font: "Arial",
              }),
            ],
            spacing: { before: 180, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [tableHeaderRow, ...createItemRows(laborItems)],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Subtotal Mano de Obra: ", bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: formatCurrencyARS(laborSubtotal), bold: true, size: 22, color: "1E40AF", font: "Arial" }),
            ],
            spacing: { before: 100, after: 240 },
          }),

          // SECCIÓN 2: PROVISIÓN DE MATERIALES NORMALIZADOS IRAM (Si hay)
          ...(materialItems.length > 0
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "2. PROVISIÓN DE MATERIALES CON SELLO IRAM Y CERTIFICACIÓN",
                      bold: true,
                      size: 22,
                      color: "1E40AF",
                      font: "Arial",
                    }),
                  ],
                  spacing: { before: 180, after: 120 },
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [tableHeaderRow, ...createItemRows(materialItems)],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: "Subtotal Materiales Normalizados: ", bold: true, size: 20, font: "Arial" }),
                    new TextRun({ text: formatCurrencyARS(materialsSubtotal), bold: true, size: 22, color: "1E40AF", font: "Arial" }),
                  ],
                  spacing: { before: 100, after: 240 },
                }),
              ]
            : []),

          // RESUMEN ECONÓMICO Y CONDICIONES DE PAGO
          new Paragraph({
            children: [
              new TextRun({
                text: "RESUMEN ECONÓMICO Y PLAN DE PAGOS",
                bold: true,
                size: 22,
                color: "15803D",
                font: "Arial",
              }),
            ],
            spacing: { before: 200, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createCell("TOTAL PRESUPUESTO:", { bold: true, width: 70 }),
                  createCell(formatCurrencyARS(quote.totalAmount), { bold: true, align: AlignmentType.RIGHT, width: 30 }),
                ],
              }),
              new TableRow({
                children: [
                  createCell(`Seña Inicial (${depositPercent}% para reserva de fecha y materiales):`, { width: 70 }),
                  createCell(formatCurrencyARS(depositAmount), { bold: true, align: AlignmentType.RIGHT, width: 30 }),
                ],
              }),
              new TableRow({
                children: [
                  createCell("Saldo Final (a cancelar contra conformidad de obra):", { width: 70 }),
                  createCell(formatCurrencyARS(remainingAmount), { align: AlignmentType.RIGHT, width: 30 }),
                ],
              }),
            ],
          }),

          // CLÁUSULAS LEGALES CONTRACTUALES
          new Paragraph({
            children: [
              new TextRun({
                text: "CONDICIONES CONTRACTUALES Y MARCO LEGAL (CÓRDOBA)",
                bold: true,
                size: 20,
                color: "0F172A",
                font: "Arial",
              }),
            ],
            spacing: { before: 300, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  quote.notes ||
                  `1. MARCO NORMATIVO: Tareas ejecutadas bajo la Ley de Seguridad Eléctrica de Córdoba N° 10.281 (${orgLicense}) y reglamento AEA 90364.\n` +
                  `2. GARANTÍA LEGAL ESCRITA: Ley 24.240 de Defensa del Consumidor (Arts. 11 y 21): seis (6) meses de garantía escrita sobre mano de obra y componentes instalados.\n` +
                  `3. CLÁUSULA ANTI-INFLACIÓN: Cotización fija hasta el ${formatDate(expirationDate)}. Variaciones de distribuidoras superiores al 10% se ajustan con factura testigo.\n` +
                  `4. CONDICIONES DE PAGO: ${depositPercent}% de seña para inicio y acopio de materiales, y ${100 - depositPercent}% final contra recepción y conformidad de obra.\n` +
                  `5. MEDIOS DE PAGO: Transferencia bancaria (Alias: ${quote.organization.bankAlias || quote.organization.aliasCbu || "A convenir"}), Mercado Pago Checkout Oficial o Efectivo.`,
                size: 16,
                color: "475569",
                font: "Arial",
              }),
            ],
            spacing: { after: 360 },
          }),

          // FIRMAS
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "\n\n_________________________________________\n",
                size: 18,
                font: "Arial",
              }),
              new TextRun({
                text: `${quote.organization.legalName || quote.organization.name || "Instalador Habilitado"}\n`,
                bold: true,
                size: 18,
                font: "Arial",
              }),
              new TextRun({
                text: `${orgLicense}\n`,
                size: 16,
                color: "64748B",
                font: "Arial",
              }),
            ],
            spacing: { before: 360 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
