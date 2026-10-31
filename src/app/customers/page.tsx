import Link from "next/link";
import { Users, UserPlus, Phone, MapPin, MessageCircle, FilePlus } from "lucide-react";
import { getCustomers, getOrganization } from "@/lib/services";
import { getSession } from "@/lib/auth";
import { formatPhoneForWhatsApp } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CustomersPage() {
  const session = await getSession();
  const orgId = session?.organizationId;
  const [customers, org] = await Promise.all([
    getCustomers(orgId),
    getOrganization(orgId),
  ]);

  const orgName = org.name || "ElectroCba";
  const orgSigner = (org as any).legalName || orgName;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#9A6E24] block">
            Padrón y Cartera de Comitentes
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0B132B] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#9A6E24]" strokeWidth={1.5} />
            <span>Directorio de Comitentes y Titulares</span>
          </h1>
          <p className="text-xs text-[#475569] font-normal">
            Base de clientes residenciales y comerciales en Córdoba Capital
          </p>
        </div>

        <Link
          href="/customers/new"
          prefetch={true}
          className="bg-[#0B132B] hover:bg-[#1C2541] text-white border border-[#1C2541] font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
          <span>Nuevo Comitente</span>
        </Link>
      </div>

      {/* LISTA DE COMITENTES */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-[#9A6E24] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-[#0B132B]">No hay comitentes registrados aún</h3>
          <p className="text-xs text-[#475569] max-w-sm mx-auto">
            Registre los datos de sus comitentes para emitir presupuestos técnicos reglamentarios en Córdoba Capital.
          </p>
          <div className="pt-2">
            <Link
              href="/customers/new"
              prefetch={true}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0B132B] hover:bg-[#1C2541] text-white text-xs font-medium rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4 text-[#C5A059]" />
              <span>Registrar Primer Comitente</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map((c) => {
            const waPhone = formatPhoneForWhatsApp(c.phone);
            const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
              `Estimado/a ${c.name}, le saluda ${orgSigner} de ${orgName} en referencia a los servicios técnicos solicitados.`
            )}`;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm hover:border-[#C5A059]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-[#0B132B]">{c.name}</h3>
                      <span className="inline-block text-[10px] font-medium uppercase tracking-wider bg-[#F8FAFC] text-[#9A6E24] px-2 py-0.5 rounded mt-1 border border-[#E2E8F0]">
                        Barrio: {c.neighborhood}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#0B132B] text-white font-medium text-xs flex items-center justify-center shrink-0 border border-[#1C2541]">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-[#475569] font-normal">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.5} />
                      <span>{c.address}</span>
                    </p>
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.5} />
                      <span>{c.phone}</span>
                    </p>
                    {c.notes && (
                      <p className="text-[11px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0] mt-2 leading-relaxed">
                        {c.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#166534] hover:bg-[#14532D] text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>WhatsApp</span>
                  </a>
                  <Link
                    href={`/quotes/new?customerId=${c.id}`}
                    prefetch={true}
                    className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all border border-[#1C2541]"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                    <span>Presupuestar</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
