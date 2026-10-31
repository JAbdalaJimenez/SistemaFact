"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { PenTool, Eraser, Check, Edit3, Trash2, CheckCircle2 } from "lucide-react";

interface SignatureCanvasProps {
  value?: string | null;
  onChange: (dataUrl: string) => void;
  onSaveImmediate?: (dataUrl: string) => Promise<void> | void;
}

interface Point {
  x: number;
  y: number;
}

export function SignatureCanvas({
  value = "",
  onChange,
  onSaveImmediate,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [isEditing, setIsEditing] = useState(!value);
  const [savingSignature, setSavingSignature] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const pointsRef = useRef<Point[]>([]);

  // Sincronizar modo edición cuando llega una firma guardada desde el servidor o localStorage
  useEffect(() => {
    if (value && value.startsWith("data:image/")) {
      setIsEditing(false);
    }
  }, [value]);

  // Inicializar resolución retina del canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0F2A4A"; // Azul marino oscuro simulando tinta estilográfica real
    ctx.lineWidth = 2.2;
  }, []);

  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(setupCanvas, 50);
      window.addEventListener("resize", setupCanvas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", setupCanvas);
      };
    }
  }, [isEditing, setupCanvas]);

  const getCoordinates = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const pt = getCoordinates(e);
    if (!pt) return;

    setIsDrawing(true);
    setHasStrokes(true);
    setSavedFeedback(false);
    pointsRef.current = [pt];

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = "#0F2A4A";
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pt = getCoordinates(e);
    if (!pt) return;

    const pts = pointsRef.current;
    pts.push(pt);

    ctx.strokeStyle = "#0F2A4A";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Suavizado con curvas cuadráticas de Bézier para simular trazo de tinta fluido
    if (pts.length < 3) {
      const b = pts[0];
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      return;
    }

    const len = pts.length;
    const p0 = pts[len - 3];
    const p1 = pts[len - 2];
    const p2 = pts[len - 1];

    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    pointsRef.current = [];
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current = [];
    setHasStrokes(false);
    setSavedFeedback(false);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;

    // Exportar PNG con fondo transparente
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);

    try {
      localStorage.setItem("electrocba_digital_signature", dataUrl);
    } catch {}

    setSavingSignature(true);
    try {
      if (onSaveImmediate) {
        await onSaveImmediate(dataUrl);
      }
      setSavedFeedback(true);
      setIsEditing(false);
    } finally {
      setSavingSignature(false);
    }
  };

  const handleRemoveSavedSignature = async () => {
    onChange("");
    try {
      localStorage.removeItem("electrocba_digital_signature");
    } catch {}
    if (onSaveImmediate) {
      await onSaveImmediate("");
    }
    setHasStrokes(false);
    setIsEditing(true);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm space-y-4">
      <div className="border-b border-[#E2E8F0] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#0B132B] flex items-center gap-2">
            <PenTool className="w-4 h-4 text-[#1D4ED8]" strokeWidth={1.8} />
            <span>6. Firma Digital para Comprobantes</span>
          </h2>
          <p className="text-xs text-[#475569]">
            Tu rúbrica se estampará automáticamente con fondo transparente en el pie de página de todos los presupuestos PDF emitidos.
          </p>
        </div>

        {value && !isEditing && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Firma Activa en PDF</span>
          </span>
        )}
      </div>

      {savedFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Firma digital guardada correctamente. Ya se incluirá en tus próximos PDFs.</span>
        </div>
      )}

      {/* VISTA PREVIA DE FIRMA GUARDADA */}
      {value && !isEditing ? (
        <div className="space-y-3">
          <div className="p-6 bg-[#F8FAFC] rounded-xl border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center space-y-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748B]">
              Vista Previa de tu Rúbrica Registrada
            </span>
            <div className="bg-white px-8 py-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Firma digital del instalador"
                className="max-h-24 w-auto object-contain select-none"
              />
              <div className="w-48 border-t border-slate-400 mt-1 pt-1 text-center">
                <p className="text-xs font-bold text-[#0F2A4A]">Electrocba</p>
                <p className="text-[10px] text-[#475569]">Ingeniería & Servicios Técnicos</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleRemoveSavedSignature}
              className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Firma (Usar línea punteada)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHasStrokes(false);
                setIsEditing(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#0F2A4A] hover:bg-[#1E3A8A] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modificar Firma</span>
            </button>
          </div>
        </div>
      ) : (
        /* LIENZO INTERACTIVO DE DIBUJO (CANVAS HTML5) */
        <div className="space-y-3">
          <div className="relative bg-white rounded-xl border-2 border-dashed border-[#94A3B8] hover:border-[#2563EB] transition-colors overflow-hidden">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: "none" }}
              className="w-full h-44 sm:h-48 block cursor-crosshair bg-white"
            />

            {/* Línea guía de firma sutil en el fondo del lienzo */}
            <div className="pointer-events-none absolute inset-x-10 bottom-8 border-b border-dotted border-slate-300 flex justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest -mb-4 bg-white px-2">
                Dibuje su firma aquí (Mouse o Pantalla Táctil)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-[#64748B]">
              Si no guardás una firma digital, el PDF mostrará la línea punteada tradicional para firma ológrafa en papel.
            </p>

            <div className="flex items-center gap-2 ml-auto">
              {value && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-slate-100 text-[#1E293B] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5 text-slate-600" />
                <span>Limpiar / Borrar</span>
              </button>

              <button
                type="button"
                disabled={!hasStrokes || savingSignature}
                onClick={handleSaveSignature}
                className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingSignature ? "Guardando..." : "Guardar Firma"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

