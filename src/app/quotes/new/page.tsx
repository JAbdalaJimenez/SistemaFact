"use client";

import { useState, useEffect, Suspense } from "react";
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
  Loader2,
  Zap,
  Download,
  FileCode,
  ShieldCheck,
  Hammer,
  Package,
} from "lucide-react";
import {
  formatCurrencyARS,
  formatPhoneForWhatsApp,
  STANDARD_LEGAL_CLAUSES,
} from "@/lib/types";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  neighborhood: string;
}

interface ItemState {
  description: string;
  itemType: "LABOR" | "MATERIALS";
  quantity: number;
  unitPrice: number;
}

function QuoteNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") || "";

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);
  const [title, setTitle] = useState("Renovación de Tablero y Adecuación Eléctrica");
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [validityDays, setValidityDays] = useState(10);
  const [notes, setNotes] = useState(STANDARD_LEGAL_CLAUSES);

  const [items, setItems] = useState<ItemState[]>([
    {
      description: "Mano de obra: Desmontaje llaves antiguas, colocación disyuntor y térmicas en riel DIN",
      itemType: "LABOR",
      quantity: 1,
      unitPrice: 50000,
    },
    {
      description: "Provisión: Disyuntor Schneider Acti9 2x40A 30mA (IRAM 2164)",
      itemType: "MATERIALS",
      quantity: 1,
      unitPrice: 45000,
    },
    {
      description: "Mano de obra: Hincado de jabalina, medición de resistencia y protocolo oficial ERSeP",
      itemType: "LABOR",
      quantity: 1,
      unitPrice: 55000,
    },
    {
      description: "Provisión: Kit jabalina cobre 1.5m, caja de inspección PVC y morceto bronce (IRAM 2309)",
      itemType: "MATERIALS",
      quantity: 1,
      unitPrice: 40000,
    },
  ]);

  const [loading, setLoading] = useState(false);
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
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomers(data);
          if (!selectedCustomerId && data.length > 0) {
            setSelectedCustomerId(data[0].id);
          }
        }
      })
      .catch((e) => console.error(e));
  }, [selectedCustomerId]);

  const handleAddItem = (
    desc = "Nueva tarea o provisión",
    price = 30000,
    type: "LABOR" | "MATERIALS" = "LABOR"
  ) => {
    setItems((prev) => [
      ...prev,
      { description: desc, itemType: type, quantity: 1, unitPrice: price },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("El presupuesto debe contener al menos un ítem");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [field]:
            field === "quantity" || field === "unitPrice"
              ? Math.max(0, Number(value))
              : value,
        };
      })
    );
  };

  // Totales discriminados
  const laborSubtotal = items
    .filter((i) => i.itemType === "LABOR")
    .reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

  const materialsSubtotal = items
    .filter((i) => i.itemType === "MATERIALS")
    .reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

  const totalAmount = laborSubtotal + materialsSubtotal;
  const depositAmount = Math.round((totalAmount * depositPercentage) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Debe seleccionar un cliente");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          title,
          depositPercentage,
          validityDays,
          notes,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear presupuesto");
      }

      setCreatedQuote(data.quote);
      setLoading(false);
    } catch (err: unknown) {
      alert(String(err));
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const baseUrl = origin || "http://localhost:3000";
  const publicUrl = createdQuote ? `${baseUrl}/p/${createdQuote.publicToken}` : "";
  const pdfDownloadUrl = createdQuote
    ? `${baseUrl}/api/quotes/${createdQuote.id}/export/pdf`
    : "";
  const docxDownloadUrl = createdQuote
    ? `${baseUrl}/api/quotes/${createdQuote.id}/export/docx`
    : "";

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Plantilla oficial solicitada de WhatsApp
  const waMessage =
    selectedCustomer && createdQuote
      ? `Hola ${selectedCustomer.name}, te comparto el presupuesto formal N° ${
          createdQuote.quoteNumber || "EC-2026-0042"
        } de ElectroCba por ${createdQuote.title}.\n\nTotal: ${formatCurrencyARS(
          createdQuote.totalAmount
        )} (Vigencia ${validityDays} días).\n\nPodés revisarlo y abonar la seña online aquí:\n🔗 ${publicUrl}\n\nO descargar el PDF formal aquí:\n📄 ${pdfDownloadUrl}`
      : "";

  const waShareUrl = selectedCustomer
    ? `https://wa.me/${formatPhoneForWhatsApp(selectedCustomer.phone)}?text=${encodeURIComponent(
        waMessage
      )}`
    : "#";

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-center space-x-3">
        <Link
          href="/quotes"
          className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E24] block">
            Protocolo Técnico ERSeP Córdoba
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Emisor de Presupuesto Formal y Contrato
          </h1>
          <p className="text-xs text-[#64748B]">
            Discriminación de Mano de Obra AEA 90364 y Materiales Homologados Sello IRAM
          </p>
        </div>
      </div>

      {/* MODAL / BANNER DE PRESUPUESTO GENERADO */}
      {createdQuote && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm space-y-5 animate-in fade-in">
          <div className="flex items-center space-x-3.5 text-[#15803D]">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#15803D] shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-[#15803D] border border-emerald-200 px-2 py-0.5 rounded">
                Comprobante Emitido y Registrado
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] mt-1">
                ¡Presupuesto {createdQuote.quoteNumber || "Formal"} Generado!
              </h2>
              <p className="text-xs text-[#64748B] tabular-nums">
                Total: <strong className="text-[#0F172A]">{formatCurrencyARS(createdQuote.totalAmount)}</strong> • Seña inicial {depositPercentage}%:{" "}
                <strong className="text-[#15803D]">{formatCurrencyARS(depositAmount)}</strong>
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Enlace Público Criptográfico para el Cliente
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full text-xs font-mono bg-white px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#0F172A]"
              />
              <button
                onClick={handleCopy}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs px-3.5 py-2 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors border border-[#1E293B]"
              >
                <Copy className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{copied ? "¡Copiado!" : "Copiar"}</span>
              </button>
            </div>
          </div>

          {/* BOTONES DE EXPORTACIÓN Y WHATSAPP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <a
              href={waShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all sm:col-span-3 active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Compartir Presupuesto y Enlace de Seña por WhatsApp</span>
            </a>

            <a
              href={pdfDownloadUrl}
              target="_blank"
              download
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all border border-[#1E293B]"
            >
              <Download className="w-4 h-4 text-[#C5A059]" />
              <span>Descargar PDF Formal</span>
            </a>

            <a
              href={docxDownloadUrl}
              target="_blank"
              download
              className="bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <FileCode className="w-4 h-4 text-[#9A6E24]" />
              <span>Descargar Word (.docx)</span>
            </a>

            <Link
              href={`/p/${createdQuote.publicToken}`}
              target="_blank"
              className="bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>Abrir Ficha Técnica</span>
            </Link>
          </div>
        </div>
      )}

      {!createdQuote && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SELECCIÓN DE CLIENTE Y TÍTULO */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E24]">
                1. Datos del Destinatario y Obra
              </span>
              <Link
                href="/customers/new"
                className="text-xs font-semibold text-[#0F172A] hover:underline flex items-center gap-1"
              >
                + Registrar Nuevo Cliente
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Cliente Destinatario *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold bg-white text-[#0F172A] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.neighborhood} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Plazo de Vigencia (Anti-Inflación)
                </label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold bg-white text-[#0F172A] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none tabular-nums"
                >
                  <option value={7}>7 días corridos</option>
                  <option value={10}>10 días corridos</option>
                  <option value={15}>15 días corridos (Recomendado)</option>
                  <option value={30}>30 días (solo Mano de Obra)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Denominación de la Obra o Proyecto *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Adecuación tablero seccional y jabalina de puesta a tierra"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none"
              />
            </div>
          </div>

          {/* PLANTILLAS RÁPIDAS ARQUITECTÓNICAS Y TÉCNICAS */}
          <div className="bg-[#FAF8F5] border border-[#EADFC7] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#EADFC7] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E24] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-[#9A6E24] stroke-[#9A6E24]" />
                Plantillas Técnicas Homologadas (AEA / ERSeP / IRAM)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Click para insertar partida</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0F172A] flex items-center gap-1">
                  <Hammer className="w-3 h-3 text-[#9A6E24]" /> Mano de Obra Calificada:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddItem(
                        "Mano de obra: Adecuación y peinado de tablero seccional en riel DIN",
                        45000,
                        "LABOR"
                      )
                    }
                    className="bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer tabular-nums shadow-sm"
                  >
                    + Tablero DIN ($45.000)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddItem(
                        "Mano de obra: Puesta a tierra y protocolo oficial medición ERSeP",
                        55000,
                        "LABOR"
                      )
                    }
                    className="bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer tabular-nums shadow-sm"
                  >
                    + Medición ERSeP ($55.000)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0F172A] flex items-center gap-1">
                  <Package className="w-3 h-3 text-[#15803D]" /> Provisión Materiales IRAM:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddItem(
                        "Provisión: Disyuntor Diferencial Schneider Acti9 2x40A 30mA (IRAM 2164)",
                        45000,
                        "MATERIALS"
                      )
                    }
                    className="bg-white hover:bg-[#F8FAFC] text-[#15803D] border border-emerald-200 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer tabular-nums shadow-sm"
                  >
                    + Disyuntor Schneider ($45.000)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddItem(
                        "Provisión: Kit jabalina cobre 1.5m, caja de inspección y morceto (IRAM 2309)",
                        40000,
                        "MATERIALS"
                      )
                    }
                    className="bg-white hover:bg-[#F8FAFC] text-[#15803D] border border-emerald-200 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer tabular-nums shadow-sm"
                  >
                    + Kit Jabalina IRAM ($40.000)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE ÍTEMS CON TIPO (LABOR / MATERIALS) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#0F172A]">
                2. Partidas del Presupuesto (Discriminación Legal)
              </span>
              <div className="text-xs font-semibold tabular-nums text-slate-600 space-x-2">
                <span>MO: {formatCurrencyARS(laborSubtotal)}</span>
                <span>•</span>
                <span>Mat: {formatCurrencyARS(materialsSubtotal)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const subtotal = item.quantity * item.unitPrice;
                const isLabor = item.itemType === "LABOR";
                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* SELECTOR DE TIPO */}
                      <select
                        value={item.itemType}
                        onChange={(e) =>
                          handleItemChange(index, "itemType", e.target.value)
                        }
                        className={`text-[10px] font-bold uppercase px-2 py-1.5 rounded-lg border cursor-pointer ${
                          isLabor
                            ? "bg-[#0F172A] text-white border-[#1E293B]"
                            : "bg-emerald-50 text-[#15803D] border-emerald-200"
                        }`}
                      >
                        <option value="LABOR">Mano de Obra</option>
                        <option value="MATERIALS">Material IRAM</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Descripción técnica de la tarea o componente"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:border-[#C5A059] outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Cantidad
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E2E8F0] text-xs font-semibold tabular-nums text-[#0F172A]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Precio Unitario (ARS)
                        </span>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(index, "unitPrice", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E2E8F0] text-xs font-semibold tabular-nums text-[#0F172A]"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Subtotal
                        </span>
                        <p className="text-xs font-bold text-[#0F172A] mt-1 tabular-nums">
                          {formatCurrencyARS(subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleAddItem("Mano de obra técnica especializada", 25000, "LABOR")
                }
                className="flex-1 py-2.5 border border-dashed border-[#1E293B]/40 hover:border-[#0F172A] text-[#0F172A] bg-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#9A6E24]" />
                <span>+ Agregar Partida Mano de Obra</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleAddItem("Provisión de material normalizado IRAM", 30000, "MATERIALS")
                }
                className="flex-1 py-2.5 border border-dashed border-emerald-300 hover:border-emerald-500 text-[#15803D] bg-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#15803D]" />
                <span>+ Agregar Provisión Material</span>
              </button>
            </div>
          </div>

          {/* CONDICIONES LEGALES Y SEÑA */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#9A6E24]">
                3. Cláusulas Contractuales y Condiciones de Cobranza
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A6E24] bg-[#FAF8F5] border border-[#EADFC7] px-2.5 py-0.5 rounded">
                Ley 10.281 ERSeP & Ley 24.240
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#0F172A]">Seña Inicial:</span>
              <div className="flex items-center gap-1.5">
                {[30, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDepositPercentage(pct)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      depositPercentage === pct
                        ? "bg-[#0F172A] text-white shadow-sm border border-[#1E293B]"
                        : "bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold text-[#15803D] ml-auto tabular-nums">
                Seña a transferir: {formatCurrencyARS(depositAmount)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] block">
                Texto Legal Contractual (Incorporado al comprobante y PDF)
              </span>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#334155] focus:border-[#C5A059] outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* RESUMEN Y BOTÓN DE GENERACIÓN - DEEP OBSIDIAN & CHAMPAGNE GOLD */}
          <div className="bg-[#0F172A] rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm border border-[#1E293B]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] block">
                Liquidación Total Presupuestada
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5 tabular-nums">
                {formatCurrencyARS(totalAmount)}
              </p>
              <p className="text-xs text-slate-300 font-medium tabular-nums mt-0.5">
                Seña para inicio ({depositPercentage}%): <span className="text-[#C5A059] font-semibold">{formatCurrencyARS(depositAmount)}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#C5A059] hover:bg-[#B08B42] text-[#0F172A] font-bold text-xs sm:text-sm py-3.5 px-6 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F172A]" />
                  <span>Emitiendo Documento Formal...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-[#0F172A]" />
                  <span>Emitir Presupuesto Formal</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Cargando emisor...</div>}>
      <QuoteNewContent />
    </Suspense>
  );
}
