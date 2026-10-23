import Link from "next/link";
import { Users, UserPlus, Phone, MapPin, MessageCircle, FilePlus, Search } from "lucide-react";
import { getCustomers } from "@/lib/services";
import { formatPhoneForWhatsApp } from "@/lib/types";

export const revalidate = 0;

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A6E24] block">
            Padrón y Cartera de Clientes
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#9A6E24]" />
            <span>Directorio de Clientes y Titulares</span>
          </h1>
          <p className="text-xs text-[#64748B]">
            Base de clientes residenciales y comerciales en Córdoba Capital
          </p>
        </div>

        <Link
          href="/customers/new"
          className="bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#1E293B] font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-[#C5A059]" />
          <span>+ Nuevo Cliente</span>
        </Link>
      </div>

      {/* LISTA DE CLIENTES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customers.map((c) => {
          const waPhone = formatPhoneForWhatsApp(c.phone);
          const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
            `Hola ${c.name}, Marcos de ElectroCba te contacta por los trabajos eléctricos.`
          )}`;

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm hover:border-[#C5A059]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A]">{c.name}</h3>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5] text-[#9A6E24] px-2 py-0.5 rounded mt-1 border border-[#EADFC7]">
                      Barrio: {c.neighborhood}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white font-semibold text-xs flex items-center justify-center shrink-0 border border-[#1E293B]">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-[#64748B]">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.address}</span>
                  </p>
                  <p className="flex items-center gap-1.5 tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </p>
                  {c.notes && (
                    <p className="text-[11px] text-[#334155] bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] mt-2">
                      {c.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* BOTONES DE ACCIÓN: WHATSAPP Y NUEVO PRESUPUESTO */}
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#15803D] hover:bg-[#166534] text-white font-medium text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span>WhatsApp</span>
                </a>
                <Link
                  href={`/quotes/new?customerId=${c.id}`}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition-all border border-[#1E293B]"
                >
                  <FilePlus className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Presupuestar</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
