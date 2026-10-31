"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Hammer,
  Package,
  Users,
  MapPin,
  Check,
  Search,
  Scale,
  FileCheck2,
  Download,
} from "lucide-react";
import {
  formatCurrencyARS,
  formatPhoneForWhatsApp,
  getDynamicLegalClauses,
  STANDARD_LEGAL_CLAUSES,
  CORDOBA_NEIGHBORHOODS,
} from "@/lib/types";
import { useDebounce } from "@/lib/use-debounce";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  notes?: string;
}

interface QuoteItemState {
  id: string;
  description: string;
  itemType: "LABOR" | "MATERIALS";
  quantity: number;
  unitPrice: number;
}

// Catálogo normativo didáctico según Reglamentación AEA 90364 y Ley Provincial 10.281
interface NormativeBlock {
  id: string;
  title: string;
  category: string;
  normativeRef: string;
  summary: string;
  laborItem: {
    description: string;
    unitPrice: number;
    quantity: number;
  };
  materialItem: {
    description: string;
    unitPrice: number;
    quantity: number;
  };
}

const NORMATIVE_BLOCKS: NormativeBlock[] = [
  {
    id: "tablero_integral",
    title: "Adecuación de Tablero Seccional y Protecciones",
    category: "Protección y Maniobra",
    normativeRef: "Reglamentación AEA 90364-7-771",
    summary: "Montaje sobre riel DIN, interruptor termomagnético bipolar y disyuntor diferencial con sensibilidad nominal <= 30mA.",
    laborItem: {
      description: "Mano de obra calificada: Desmontaje de elementos obsoletos, montaje en riel DIN, conexionado de disyuntor diferencial bipolar y termomagnéticas conforme AEA 90364-7-771 con ensayo de disparo.",
      unitPrice: 65000,
      quantity: 1,
    },
    materialItem: {
      description: "Provisión normalizada: Disyuntor diferencial Schneider Acti9 2x40A 30mA (IRAM 2164) + 3 Térmicas bipolares Schneider/Sica curva C (Sello IRAM).",
      unitPrice: 85000,
      quantity: 1,
    },
  },
  {
    id: "puesta_a_tierra",
    title: "Puesta a Tierra y Medición Protocolo ERSeP",
    category: "Seguridad y Descarga",
    normativeRef: "Ley de Seguridad Eléctrica de Córdoba N° 10.281",
    summary: "Hincado de jabalina de acero-cobre normalizada IRAM 2309, cámara de inspección y protocolo de resistencia por telurímetro.",
    laborItem: {
      description: "Mano de obra calificada: Hincado de jabalina, fijación de morceto de bronce forjado, tendido conductor PE 1x6 mm², medición de resistencia de tierra y emisión de protocolo ERSeP Ley 10.281.",
      unitPrice: 60000,
      quantity: 1,
    },
    materialItem: {
      description: "Provisión normalizada: Jabalina de acero-cobre IRAM 2309 (1.50m x 5/8\") + Cámara de inspección PVC reforzada 150x150mm + Morceto de bronce forjado.",
      unitPrice: 42000,
      quantity: 1,
    },
  },
  {
    id: "recableado_circuitos",
    title: "Recableado Integral de Circuitos IUG / TUG",
    category: "Canalización y Conductores",
    normativeRef: "Norma IRAM NM 247-3 y AEA 90364",
    summary: "Extracción de conductores de tela o degradados y tendido de conductores ignífugos antiflama con sección reglamentaria.",
    laborItem: {
      description: "Mano de obra calificada: Extracción de conductores antiguos fuera de norma, limpieza de cañería y pasaje de conductores ignífugos normalizados separando circuitos IUG y TUG (15 bocas).",
      unitPrice: 18000,
      quantity: 15,
    },
    materialItem: {
      description: "Provisión normalizada: Bobina de conductores de cobre electrolítico aislados en PVC ignífugo Prysmian Superastic IRAM NM 247-3 (Fase/Neutro/PE 2.5 mm²).",
      unitPrice: 110000,
      quantity: 1,
    },
  },
  {
    id: "acometida_pilar",
    title: "Acometida y Pilar Homologado EPEC",
    category: "Punto de Suministro",
    normativeRef: "Especificación Técnica ET 101 EPEC",
    summary: "Caño de bajada doble aislación, pipeta reglamentaria, caja de medidor estanca con visor y protección general contigua.",
    laborItem: {
      description: "Mano de obra calificada: Montaje de caño de bajada reglamentario con doble aislación, caja estanca de medidor, protección termomagnética general y jabalina de pie según ET 101 EPEC.",
      unitPrice: 95000,
      quantity: 1,
    },
    materialItem: {
      description: "Provisión normalizada: Caño galvanizado homologado EPEC 1 1/2\" doble aislación + Pipeta baquelita + Caja de medidor monofásica con visor de policarbonato.",
      unitPrice: 88000,
      quantity: 1,
    },
  },
  {
    id: "circuito_tue_clima",
    title: "Circuito Dedicado Climatización (TUE 20A)",
    category: "Cargas Especiales",
    normativeRef: "Norma IRAM 2071 y AEA 90364",
    summary: "Línea independiente desde tablero seccional en conductores de 4 mm² con toma de 20A exclusivo para equipo de aire acondicionado.",
    laborItem: {
      description: "Mano de obra calificada: Tendido de cañería rígida a la vista o embutida, pasaje de conductores 4 mm² y montaje de tomacorriente de 20A con protección individual.",
      unitPrice: 45000,
      quantity: 1,
    },
    materialItem: {
      description: "Provisión normalizada: Módulo tomacorriente 20A bipolar con toma a tierra Jeluz Platino (IRAM 2071) + Termomagnética bipolar Schneider 20A + Conductores 4mm².",
      unitPrice: 48000,
      quantity: 1,
    },
  },
];

function QuoteWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") || "";

  // Paso actual del Stepper (1 a 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Paso 1: Comitente y Emplazamiento
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedSearch = useDebounce(customerSearch, 300);

  // Organización del instalador
  const [org, setOrg] = useState<{
    name: string;
    legalName?: string;
    ersepLicenseNumber?: string;
    ersepLicense?: string;
    cuit?: string;
    vatCondition?: string;
    legalAddress?: string;
    phone?: string;
    bankAlias?: string;
  } | null>(null);

  // Alta Rápida de Comitente
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("+54 9 351 ");
  const [quickAddress, setQuickAddress] = useState("");
  const [quickNeighborhood, setQuickNeighborhood] = useState("Centro");
  const [savingQuickCustomer, setSavingQuickCustomer] = useState(false);

  // Datos específicos del emplazamiento
  const [title, setTitle] = useState("Renovación de Tablero Seccional y Adecuación Normativa AEA");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteNeighborhood, setSiteNeighborhood] = useState("Centro");
  const [siteNotes, setSiteNotes] = useState("");

  // Paso 2 y 3: Partidas y Estructura de Costos
  const [activeTab, setActiveTab] = useState<"LABOR" | "MATERIALS">("LABOR");
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>(["tablero_integral", "puesta_a_tierra"]);
  const [taxRate, setTaxRate] = useState<number>(0);

  const [items, setItems] = useState<QuoteItemState[]>([
    {
      id: "init_l1",
      description: "Mano de obra calificada: Desmontaje de elementos obsoletos, montaje en riel DIN, conexionado de disyuntor diferencial bipolar y termomagnéticas conforme AEA 90364-7-771 con ensayo de disparo.",
      itemType: "LABOR",
      quantity: 1,
      unitPrice: 65000,
    },
    {
      id: "init_l2",
      description: "Mano de obra calificada: Hincado de jabalina, fijación de morceto de bronce forjado, tendido conductor PE 1x6 mm², medición de resistencia de tierra y emisión de protocolo ERSeP Ley 10.281.",
      itemType: "LABOR",
      quantity: 1,
      unitPrice: 60000,
    },
    {
      id: "init_m1",
      description: "Provisión normalizada: Disyuntor diferencial Schneider Acti9 2x40A 30mA (IRAM 2164) + 3 Térmicas bipolares Schneider/Sica curva C (Sello IRAM).",
      itemType: "MATERIALS",
      quantity: 1,
      unitPrice: 85000,
    },
    {
      id: "init_m2",
      description: "Provisión normalizada: Jabalina de acero-cobre IRAM 2309 (1.50m x 5/8\") + Cámara de inspección PVC reforzada 150x150mm + Morceto de bronce forjado.",
      itemType: "MATERIALS",
      quantity: 1,
      unitPrice: 42000,
    },
  ]);

  // Paso 4: Condiciones Legales
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [validityDays, setValidityDays] = useState(15);
  const [notes, setNotes] = useState(STANDARD_LEGAL_CLAUSES);

  // Estados de emisión
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<{
    id: string;
    publicToken: string;
    quoteNumber?: string;
    totalAmount: number;
    title: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);

    // Cargar perfil del instalador
    fetch("/api/organization", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.organization) {
          setOrg(data.organization);
          setNotes(
            getDynamicLegalClauses({
              organization: data.organization,
              validityDays: 15,
              depositPercentage: 50,
            })
          );
        }
      })
      .catch(() => {});

    // Cargar comitentes
    fetch("/api/customers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomers(data);
          if (data.length > 0) {
            setSelectedCustomerId((prev) => {
              const current = prev || data[0].id;
              const found = data.find((c) => c.id === current);
              if (found) {
                setSiteAddress(found.address);
                setSiteNeighborhood(found.neighborhood || "Centro");
                setSiteNotes(found.notes || "");
              }
              return current;
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (org) {
      setNotes(
        getDynamicLegalClauses({
          organization: org,
          validityDays,
          depositPercentage,
        })
      );
    }
  }, [validityDays, depositPercentage, org]);

  const handleCreateQuickCustomer = async () => {
    if (!quickName.trim() || !quickAddress.trim()) {
      alert("Por favor ingrese el nombre y dirección del comitente");
      return;
    }
    setSavingQuickCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickName.trim(),
          phone: quickPhone.trim() || "+5493510000000",
          address: quickAddress.trim(),
          neighborhood: quickNeighborhood,
          notes: "Alta rápida desde emisor de presupuesto",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear comitente");
      setCustomers((prev) => [data, ...prev]);
      handleSelectCustomer(data);
      setShowQuickCustomer(false);
      setQuickName("");
      setQuickAddress("");
    } catch (err: unknown) {
      alert(String(err));
    } finally {
      setSavingQuickCustomer(false);
    }
  };

  // Filtrado de comitentes optimizado con debounce
  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return customers;
    const term = debouncedSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term) ||
        c.neighborhood.toLowerCase().includes(term)
    );
  }, [customers, debouncedSearch]);

  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomerId(c.id);
    setSiteAddress(c.address);
    setSiteNeighborhood(c.neighborhood || "Nueva Córdoba");
    setSiteNotes(c.notes || "");
  };

  // Didáctica: Toggle de bloques normativos automáticos
  const handleToggleBlock = (block: NormativeBlock) => {
    const isSelected = selectedBlockIds.includes(block.id);
    if (isSelected) {
      // Deseleccionar y remover ítems correspondientes si el usuario lo desea
      setSelectedBlockIds((prev) => prev.filter((id) => id !== block.id));
      setItems((prev) =>
        prev.filter(
          (item) =>
            item.description !== block.laborItem.description &&
            item.description !== block.materialItem.description
        )
      );
    } else {
      // Seleccionar y autocompletar alcance técnico y partidas en costo
      setSelectedBlockIds((prev) => [...prev, block.id]);
      setItems((prev) => [
        ...prev,
        {
          id: `b_${block.id}_l_${Date.now()}`,
          description: block.laborItem.description,
          itemType: "LABOR",
          quantity: block.laborItem.quantity,
          unitPrice: block.laborItem.unitPrice,
        },
        {
          id: `b_${block.id}_m_${Date.now() + 1}`,
          description: block.materialItem.description,
          itemType: "MATERIALS",
          quantity: block.materialItem.quantity,
          unitPrice: block.materialItem.unitPrice,
        },
      ]);
    }
  };

  // Acciones en partidas de costos
  const handleAddItem = (type: "LABOR" | "MATERIALS") => {
    const isLabor = type === "LABOR";
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        description: isLabor
          ? "Mano de obra calificada: Adecuación y conexionado según Norma AEA 90364"
          : "Provisión normalizada: Componente con certificación de Sello IRAM",
        itemType: type,
        quantity: 1,
        unitPrice: isLabor ? 40000 : 35000,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert("El presupuesto debe contener al menos un concepto técnico o provisión.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: "description" | "quantity" | "unitPrice", value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: field === "description" ? value : Math.max(0, Number(value)),
        };
      })
    );
  };

  // Cálculos totales con discriminación de Mano de Obra, Insumos e Impuestos
  const laborSubtotal = useMemo(() => {
    return items
      .filter((i) => i.itemType === "LABOR")
      .reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
  }, [items]);

  const materialsSubtotal = useMemo(() => {
    return items
      .filter((i) => i.itemType === "MATERIALS")
      .reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);
  }, [items]);

  const netAmount = laborSubtotal + materialsSubtotal;
  const taxAmount = Math.round((netAmount * taxRate) / 100);
  const totalAmount = netAmount + taxAmount;
  const depositAmount = Math.round((totalAmount * depositPercentage) / 100);
  const remainingAmount = totalAmount - depositAmount;

  // Emisión final formal
  const handleFinalSubmit = async () => {
    if (!selectedCustomerId) {
      alert("Debe seleccionar o registrar un comitente en el Paso 1.");
      setCurrentStep(1);
      return;
    }

    if (items.length === 0 || totalAmount <= 0) {
      alert("Debe incluir partidas válidas en la Estructura de Costos.");
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          title,
          depositPercentage,
          validityDays,
          taxRate,
          notes,
          items: items.map(({ description, itemType, quantity, unitPrice }) => ({
            description,
            itemType,
            quantity,
            unitPrice,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al emitir presupuesto formal");
      }

      setCreatedQuote(data.quote);
      setSubmitting(false);
    } catch (err: unknown) {
      alert(String(err));
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const baseUrl = origin || "http://localhost:3001";
  const publicUrl = createdQuote ? `${baseUrl}/p/${createdQuote.publicToken}` : "";
  const pdfDownloadUrl = createdQuote
    ? `${baseUrl}/api/quotes/${createdQuote.id}/export/pdf`
    : "";
  const docxDownloadUrl = createdQuote
    ? `${baseUrl}/api/quotes/${createdQuote.id}/export/docx`
    : "";

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Mensaje formal de WhatsApp sin emojis ni informalismos
  const orgNameDisplay = org?.name || "ElectroCba";
  const orgLicenseDisplay = org?.ersepLicenseNumber || org?.ersepLicense || "Matrícula Habilitada ERSeP";
  const signerDisplay = org?.legalName || org?.name || "Instalador Habilitado";

  const waMessage =
    selectedCustomer && createdQuote
      ? `Estimado/a ${selectedCustomer.name}:\n\nPor medio del presente le remitimos el Presupuesto Formal N° ${
          createdQuote.quoteNumber || "EC-2026-0042"
        } emitido por ${orgNameDisplay} (${orgLicenseDisplay}) correspondiente a: ${createdQuote.title}.\n\nImporte Total: ${formatCurrencyARS(
          createdQuote.totalAmount
        )} (Vigencia legal: ${validityDays} días corridos).\n\nPuede revisar la ficha técnica reglamentaria y confirmar el anticipo del ${depositPercentage}% en el siguiente enlace oficial:\n${publicUrl}\n\nAsimismo, puede descargar el instrumento en formato PDF formal:\n${pdfDownloadUrl}\n\nAtentamente,\n${signerDisplay} - ${orgLicenseDisplay}.`
      : "";

  const waShareUrl = selectedCustomer
    ? `https://wa.me/${formatPhoneForWhatsApp(selectedCustomer.phone)}?text=${encodeURIComponent(
        waMessage
      )}`
    : "#";

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* ENCABEZADO INSTITUCIONAL */}
      <div className="flex items-center space-x-3">
        <Link
          href="/quotes"
          prefetch={true}
          className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:text-[#0B132B] shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </Link>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
            Protocolo Técnico ERSeP Córdoba • AEA 90364
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0B132B] tracking-tight">
            Emisor de Presupuesto Formal y Dictamen Contractual
          </h1>
          <p className="text-xs text-[#475569] font-normal">
            Flujo de Progressive Disclosure con autocompletado normativo y auditoría legal
          </p>
        </div>
      </div>

      {/* MODAL / PANTALLA DE ÉXITO DE EMISIÓN */}
      {createdQuote ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center space-x-3 text-[#166534]">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#166534] shrink-0">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-[#166534] border border-emerald-200 px-2 py-0.5 rounded">
                Expediente Registrado con Éxito
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-[#0B132B] mt-1">
                Presupuesto {createdQuote.quoteNumber || "Formal"} Emitido
              </h2>
              <p className="text-xs text-[#475569] tabular-nums font-normal">
                Monto Total: <strong className="text-[#0B132B] font-semibold">{formatCurrencyARS(createdQuote.totalAmount)}</strong> • Seña inicial pactada ({depositPercentage}%):{" "}
                <strong className="text-[#166534] font-semibold">{formatCurrencyARS(depositAmount)}</strong>
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
            <span className="text-[10px] font-medium text-[#475569] uppercase tracking-wider block">
              Enlace Público Seguro para el Comitente (Acceso sin autenticación)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full text-xs font-mono bg-white px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[#0B132B]"
              />
              <button
                onClick={handleCopyLink}
                className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs px-3.5 py-2.5 rounded-lg shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                <span>{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#F8FAFC] hover:bg-slate-100 text-[#0B132B] font-medium text-xs py-3 px-4 rounded-xl border border-[#E2E8F0] flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Ver Ficha Técnica Web</span>
            </a>

            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#F8FAFC] hover:bg-slate-100 text-[#0B132B] font-medium text-xs py-3 px-4 rounded-xl border border-[#E2E8F0] flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Descargar PDF Vectorial</span>
            </a>

            <a
              href={waShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#166534] hover:bg-[#14532D] text-white font-medium text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Notificar por WhatsApp</span>
            </a>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
            <Link
              href="/quotes"
              prefetch={true}
              className="text-xs font-medium text-[#0B132B] hover:underline"
            >
              Volver al listado de presupuestos
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* STEPPER / PROGRESSIVE DISCLOSURE WIZARD (4 PASOS) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-sm">
            <div className="grid grid-cols-4 gap-2 sm:gap-4 items-center">
              {[
                { step: 1, label: "Comitente y Sitio", desc: "Emplazamiento" },
                { step: 2, label: "Alcance Normativo", desc: "AEA 90364 Didáctico" },
                { step: 3, label: "Estructura Costos", desc: "Mano de Obra / Insumos" },
                { step: 4, label: "Auditoría Legal", desc: "Ley 24.240 y Emisión" },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isPassed = currentStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setCurrentStep(s.step as any)}
                    className={`flex flex-col items-start p-2 sm:p-2.5 rounded-xl border transition-all text-left ${
                      isActive
                        ? "border-[#0B132B] bg-[#0B132B]/5 ring-1 ring-[#0B132B]"
                        : isPassed
                        ? "border-emerald-200 bg-emerald-50/40 text-emerald-900"
                        : "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] opacity-70"
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 w-full">
                      <span
                        className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-semibold shrink-0 ${
                          isActive
                            ? "bg-[#0B132B] text-white"
                            : isPassed
                            ? "bg-[#166534] text-white"
                            : "bg-[#E2E8F0] text-[#475569]"
                        }`}
                      >
                        {isPassed ? <Check className="w-3 h-3" strokeWidth={2} /> : s.step}
                      </span>
                      <span className="text-[11px] font-semibold truncate text-[#0B132B]">
                        {s.label}
                      </span>
                    </div>
                    <span className="hidden sm:block text-[10px] text-[#475569] mt-1 pl-6 truncate font-normal">
                      {s.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASO 1: DATOS DEL COMITENTE Y EMPLAZAMIENTO */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in">
              <div className="border-b border-[#E2E8F0] pb-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
                  Paso 1 de 4
                </span>
                <h2 className="text-lg font-semibold text-[#0B132B] mt-0.5">
                  Datos del Comitente y Emplazamiento Técnico
                </h2>
                <p className="text-xs text-[#475569] font-normal">
                  Identificación del titular de la instalación y domicilio de ejecución en Córdoba
                </p>
              </div>

              {/* Selector / Búsqueda de Comitente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B]">
                    Seleccionar Comitente *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCustomer((v) => !v)}
                    className="text-xs font-medium text-[#0B132B] hover:text-[#C5A059] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                    <span>{showQuickCustomer ? "Ocultar Alta Rápida" : "Alta Rápida de Comitente"}</span>
                  </button>
                </div>

                {/* FORMULARIO DE ALTA RÁPIDA DE COMITENTE */}
                {showQuickCustomer && (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#CBD5E1] space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#0B132B]">
                        Nuevo Comitente Directo
                      </span>
                      <span className="text-[10px] text-[#475569]">
                        Se vinculará automáticamente a este presupuesto
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-[#475569] uppercase mb-0.5">
                          Nombre y Apellido / Razón Social *
                        </label>
                        <input
                          type="text"
                          value={quickName}
                          onChange={(e) => setQuickName(e.target.value)}
                          placeholder="Ej: Ing. Roberto Sánchez"
                          className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-normal bg-white text-[#0B132B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-[#475569] uppercase mb-0.5">
                          Teléfono / WhatsApp *
                        </label>
                        <input
                          type="text"
                          value={quickPhone}
                          onChange={(e) => setQuickPhone(e.target.value)}
                          placeholder="+54 9 351 ..."
                          className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-normal bg-white text-[#0B132B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-[#475569] uppercase mb-0.5">
                          Dirección del Inmueble *
                        </label>
                        <input
                          type="text"
                          value={quickAddress}
                          onChange={(e) => setQuickAddress(e.target.value)}
                          placeholder="Ej: Av. Colón 1250 4° B"
                          className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-normal bg-white text-[#0B132B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-[#475569] uppercase mb-0.5">
                          Barrio de Córdoba
                        </label>
                        <select
                          value={quickNeighborhood}
                          onChange={(e) => setQuickNeighborhood(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-normal bg-white text-[#0B132B]"
                        >
                          {CORDOBA_NEIGHBORHOODS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickCustomer(false)}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs text-[#475569] hover:bg-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingQuickCustomer}
                        onClick={handleCreateQuickCustomer}
                        className="px-4 py-1.5 rounded-lg bg-[#0B132B] hover:bg-[#1C2541] disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={2} />
                        <span>{savingQuickCustomer ? "Guardando..." : "Guardar y Asignar"}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className="w-4 h-4 text-[#475569] absolute left-3.5 top-3" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre, barrio o calle..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-normal bg-[#F8FAFC] focus:bg-white focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {filteredCustomers.length === 0 ? (
                    <div className="col-span-full p-4 text-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]">
                      <p className="text-xs text-[#475569] mb-2 font-normal">
                        No hay comitentes registrados que coincidan con la búsqueda.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowQuickCustomer(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B132B] text-white text-xs font-medium rounded-lg hover:bg-[#1C2541] cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-[#C5A059]" strokeWidth={2} />
                        <span>Crear Comitente Ahora</span>
                      </button>
                    </div>
                  ) : (
                    filteredCustomers.map((c) => {
                      const isSelected = selectedCustomerId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-[#0B132B] bg-[#0B132B]/5 ring-1 ring-[#0B132B]"
                              : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#0B132B] truncate">{c.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#0B132B]" strokeWidth={2} />}
                          </div>
                          <p className="text-[11px] text-[#475569] truncate font-normal mt-0.5">{c.address}</p>
                          <span className="text-[10px] text-[#9A6E24] font-medium block mt-1">
                            {c.neighborhood}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Título Descriptivo y Dirección de la Obra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                    Carátula / Objeto del Presupuesto *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Adecuación Integral de Tablero Seccional y Puesta a Tierra"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-normal text-[#0B132B] focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                    Dirección de Emplazamiento
                  </label>
                  <input
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="Calle y número"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-normal text-[#0B132B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                    Barrio de Córdoba
                  </label>
                  <select
                    value={siteNeighborhood}
                    onChange={(e) => setSiteNeighborhood(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-normal text-[#0B132B] bg-white"
                  >
                    {CORDOBA_NEIGHBORHOODS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                    Observaciones Técnicas de Acceso o Consorcio
                  </label>
                  <textarea
                    rows={2}
                    value={siteNotes}
                    onChange={(e) => setSiteNotes(e.target.value)}
                    placeholder="Ej: Edificio con control de guardia. Se debe cortar energía general entre 10:00 y 12:00 hs."
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-normal text-[#0B132B]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <span>Continuar a Alcance Normativo</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: ALCANCE TÉCNICO Y NORMATIVO (DIDÁCTICO AEA 90364) */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in">
              <div className="border-b border-[#E2E8F0] pb-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
                  Paso 2 de 4
                </span>
                <h2 className="text-lg font-semibold text-[#0B132B] mt-0.5">
                  Alcance Didáctico según Norma AEA 90364 y Ley 10.281
                </h2>
                <p className="text-xs text-[#475569] font-normal">
                  Haga clic en los módulos técnicos requeridos para autocompletar la descripción normativa y la provisión IRAM asociada.
                </p>
              </div>

              {/* Bloques Seleccionables Didácticos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {NORMATIVE_BLOCKS.map((block) => {
                  const isChecked = selectedBlockIds.includes(block.id);
                  return (
                    <div
                      key={block.id}
                      onClick={() => handleToggleBlock(block)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isChecked
                          ? "border-[#0B132B] bg-[#0B132B]/5 ring-1 ring-[#0B132B]"
                          : "border-[#E2E8F0] hover:border-[#CBD5E1] bg-[#F8FAFC]"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[#475569] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                              {block.category}
                            </span>
                            <h3 className="text-sm font-semibold text-[#0B132B] mt-1.5">
                              {block.title}
                            </h3>
                          </div>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                              isChecked
                                ? "bg-[#0B132B] text-white border-[#0B132B]"
                                : "bg-white border-[#CBD5E1]"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={2} />}
                          </div>
                        </div>

                        <p className="text-xs text-[#475569] mt-2 font-normal leading-relaxed">
                          {block.summary}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#E2E8F0]/70 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#9A6E24] font-medium">
                          {block.normativeRef}
                        </span>
                        <span className="text-[#0B132B] font-medium tabular-nums">
                          Sugerido: {formatCurrencyARS(block.laborItem.unitPrice + block.materialItem.unitPrice)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#475569] font-normal">
                  Módulos técnicos aplicados: <strong className="text-[#0B132B] font-semibold">{selectedBlockIds.length}</strong> partidas activas.
                </span>
                <span className="font-mono text-[#0B132B] font-medium">
                  {items.length} líneas en presupuesto
                </span>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                >
                  Regresar a Comitente
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <span>Continuar a Estructura de Costos</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: ESTRUCTURA DE COSTOS (TABS SEPARADOS) */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in">
              <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
                    Paso 3 de 4
                  </span>
                  <h2 className="text-lg font-semibold text-[#0B132B] mt-0.5">
                    Estructura Formal de Costos
                  </h2>
                  <p className="text-xs text-[#475569] font-normal">
                    Discriminación obligatoria entre Mano de Obra Especializada e Insumos Normalizados IRAM
                  </p>
                </div>

                {/* Subtotales en Vivo */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#475569]">
                    Total Acumulado
                  </span>
                  <p className="text-xl font-semibold text-[#0B132B] tabular-nums">
                    {formatCurrencyARS(totalAmount)}
                  </p>
                </div>
              </div>

              {/* TABS DE DISCRIMINACIÓN */}
              <div className="flex border-b border-[#E2E8F0] space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("LABOR")}
                  className={`pb-3 text-xs font-medium transition-all relative flex items-center gap-2 ${
                    activeTab === "LABOR"
                      ? "text-[#0B132B] font-semibold border-b-2 border-[#0B132B]"
                      : "text-[#475569] hover:text-[#0B132B]"
                  }`}
                >
                  <Hammer className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
                  <span>Mano de Obra Especializada</span>
                  <span className="ml-1 text-[10px] bg-slate-100 text-[#0B132B] px-1.5 py-0.5 rounded tabular-nums font-semibold">
                    {formatCurrencyARS(laborSubtotal)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("MATERIALS")}
                  className={`pb-3 text-xs font-medium transition-all relative flex items-center gap-2 ${
                    activeTab === "MATERIALS"
                      ? "text-[#0B132B] font-semibold border-b-2 border-[#0B132B]"
                      : "text-[#475569] hover:text-[#0B132B]"
                  }`}
                >
                  <Package className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
                  <span>Insumos y Materiales IRAM</span>
                  <span className="ml-1 text-[10px] bg-slate-100 text-[#0B132B] px-1.5 py-0.5 rounded tabular-nums font-semibold">
                    {formatCurrencyARS(materialsSubtotal)}
                  </span>
                </button>
              </div>

              {/* TABLA DE ÍTEMS DEL TAB SELECCIONADO */}
              <div className="space-y-3">
                {items
                  .filter((i) => i.itemType === activeTab)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                          className="w-full text-xs font-normal text-[#0B132B] bg-white p-2.5 rounded-lg border border-[#E2E8F0] focus:border-[#0B132B]"
                        />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20">
                          <label className="block text-[10px] text-[#475569] uppercase font-medium mb-0.5">
                            Cant.
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-center bg-white tabular-nums"
                          />
                        </div>

                        <div className="w-32">
                          <label className="block text-[10px] text-[#475569] uppercase font-medium mb-0.5">
                            Precio Unitario
                          </label>
                          <input
                            type="number"
                            step="1000"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-right bg-white tabular-nums"
                          />
                        </div>

                        <div className="w-28 text-right">
                          <span className="block text-[10px] text-[#475569] uppercase font-medium mb-0.5">
                            Subtotal
                          </span>
                          <span className="text-xs font-semibold text-[#0B132B] tabular-nums block py-1.5">
                            {formatCurrencyARS(item.quantity * item.unitPrice)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer mt-3 sm:mt-0"
                          title="Eliminar partida"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}

                <button
                  type="button"
                  onClick={() => handleAddItem(activeTab)}
                  className="w-full py-2.5 border border-dashed border-[#CBD5E1] hover:border-[#0B132B] rounded-xl text-xs font-medium text-[#475569] hover:text-[#0B132B] flex items-center justify-center gap-1.5 transition-colors bg-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                  <span>
                    Añadir {activeTab === "LABOR" ? "Tarea de Mano de Obra" : "Material / Insumo IRAM"}
                  </span>
                </button>
              </div>

              {/* CONDICIONES DE COBRO, IMPUESTOS Y VIGENCIA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0]">
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <label className="block text-xs font-medium text-[#0B132B] uppercase tracking-wider mb-1">
                    Condición Impositiva / Alícuota IVA
                  </label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold bg-white text-[#0B132B]"
                  >
                    <option value={0}>0% - Monotributo / Exento</option>
                    <option value={10.5}>10.5% - IVA Alícuota Reducida</option>
                    <option value={21}>21% - IVA Alícuota General</option>
                  </select>
                  <span className="text-[11px] text-[#475569] block mt-1">
                    {taxRate > 0 ? `Impuestos: ${formatCurrencyARS(taxAmount)}` : "Sin discriminación tributaria"}
                  </span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <label className="block text-xs font-medium text-[#0B132B] uppercase tracking-wider mb-1">
                    Porcentaje de Seña Requerido (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={depositPercentage}
                      onChange={(e) => setDepositPercentage(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold bg-white tabular-nums"
                    />
                    <span className="text-xs text-[#475569] font-normal tabular-nums">
                      Anticipo: <strong className="text-[#166534] font-semibold">{formatCurrencyARS(depositAmount)}</strong>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <label className="block text-xs font-medium text-[#0B132B] uppercase tracking-wider mb-1">
                    Plazo de Vigencia Comercial (Días)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="3"
                      max="60"
                      value={validityDays}
                      onChange={(e) => setValidityDays(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold bg-white tabular-nums"
                    />
                    <span className="text-xs text-[#475569] font-normal">
                      Cláusula anti-inflación
                    </span>
                  </div>
                </div>
              </div>

              {/* DESGLOSE RESUMIDO DE COSTOS */}
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
                <div className="flex justify-between text-[#475569]">
                  <span>Subtotal Mano de Obra:</span>
                  <span className="font-medium text-[#0B132B] tabular-nums">{formatCurrencyARS(laborSubtotal)}</span>
                </div>
                <div className="flex justify-between text-[#475569]">
                  <span>Subtotal Insumos y Materiales IRAM:</span>
                  <span className="font-medium text-[#0B132B] tabular-nums">{formatCurrencyARS(materialsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-[#475569] pt-1 border-t border-[#E2E8F0]">
                  <span>Subtotal Neto:</span>
                  <span className="font-semibold text-[#0B132B] tabular-nums">{formatCurrencyARS(netAmount)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-[#475569]">
                    <span>IVA / Retenciones ({taxRate}%):</span>
                    <span className="font-medium text-[#0B132B] tabular-nums">{formatCurrencyARS(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-[#0B132B] pt-1 border-t border-[#E2E8F0]">
                  <span>Total General del Presupuesto:</span>
                  <span className="text-[#C5A059] tabular-nums">{formatCurrencyARS(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#166534] pt-1">
                  <span>Seña Requerida ({depositPercentage}%):</span>
                  <span className="font-semibold tabular-nums">{formatCurrencyARS(depositAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#475569]">
                  <span>Saldo a la Finalización ({100 - depositPercentage}%):</span>
                  <span className="font-medium tabular-nums">{formatCurrencyARS(remainingAmount)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                >
                  Regresar a Alcance Normativo
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <span>Continuar a Auditoría Legal y Emisión</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: AUDITORÍA LEGAL Y EMISIÓN (LEY 24.240 Y EMISIÓN FORMAL) */}
          {currentStep === 4 && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm space-y-6 animate-in fade-in">
              <div className="border-b border-[#E2E8F0] pb-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
                  Paso 4 de 4
                </span>
                <h2 className="text-lg font-semibold text-[#0B132B] mt-0.5">
                  Auditoría Legal y Emisión Formal del Expediente
                </h2>
                <p className="text-xs text-[#475569] font-normal">
                  Inspección de cláusulas contractuales conforme a la Ley de Defensa del Consumidor N° 24.240 y Ley 10.281
                </p>
              </div>

              {/* Resumen Ejecutivo del Dictamen */}
              <div className="p-5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-medium text-[#475569] block">Comitente Titular</span>
                    <p className="font-semibold text-[#0B132B] mt-0.5">{selectedCustomer?.name || "Sin seleccionar"}</p>
                    <p className="text-[#475569] font-normal">{siteAddress} ({siteNeighborhood})</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-medium text-[#475569] block">Habilitación Oficial</span>
                    <p className="font-semibold text-[#0B132B] mt-0.5">
                      {org?.legalName || org?.name || "Instalador Electricista"} • {org?.ersepLicenseNumber || org?.ersepLicense || "Matrícula Habilitada ERSeP"}
                    </p>
                    <p className="text-[#475569] font-normal">
                      CUIT {org?.cuit || "No informado"} • {org?.vatCondition || "Monotributista"}
                    </p>
                  </div>
                </div>

                {/* Balances Tabulares */}
                <div className="pt-3 border-t border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#475569] uppercase font-medium block">Mano de Obra</span>
                    <span className="text-xs font-semibold text-[#0B132B] tabular-nums mt-0.5 block">
                      {formatCurrencyARS(laborSubtotal)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#475569] uppercase font-medium block">Insumos IRAM</span>
                    <span className="text-xs font-semibold text-[#0B132B] tabular-nums mt-0.5 block">
                      {formatCurrencyARS(materialsSubtotal)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-[#166534] uppercase font-medium block">Seña ({depositPercentage}%)</span>
                    <span className="text-xs font-semibold text-[#166534] tabular-nums mt-0.5 block">
                      {formatCurrencyARS(depositAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#0B132B] text-white rounded-lg">
                    <span className="text-[10px] text-slate-300 uppercase font-medium block">Total Final</span>
                    <span className="text-xs font-semibold text-[#C5A059] tabular-nums mt-0.5 block">
                      {formatCurrencyARS(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vista de Cláusulas Contractuales de Ley */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-medium text-[#0B132B]">
                  <Scale className="w-4 h-4 text-[#9A6E24]" strokeWidth={1.5} />
                  <span>Cláusulas de Garantía Legal Escrita y Marco Normativo Vigente</span>
                </div>
                <textarea
                  rows={6}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3.5 bg-white rounded-xl border border-[#E2E8F0] text-xs font-mono leading-relaxed text-[#475569] focus:text-[#0B132B] focus:border-[#0B132B]"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                >
                  Regresar a Costos
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="bg-[#0B132B] hover:bg-[#1C2541] disabled:opacity-60 text-white font-semibold text-xs sm:text-sm py-3 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <FileCheck2 className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
                  <span>{submitting ? "Generando Expediente..." : "Emitir Presupuesto Formal"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuoteNewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#475569]">Cargando emisor normativo...</div>}>
      <QuoteWizardContent />
    </Suspense>
  );
}
