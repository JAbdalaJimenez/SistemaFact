"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  UserCog,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Lock,
  ArrowLeft,
  Users,
  Briefcase,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "OWNER" | "MEMBER" | string;
  phone?: string | null;
  organizationName?: string;
  createdAt: string;
}

interface Props {
  currentUser: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  initialUsers?: UserItem[];
}

export function UsersManagerClient({ currentUser, initialUsers = [] }: Props) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [loading, setLoading] = useState(initialUsers.length === 0);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulario nuevo usuario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"SUPERADMIN" | "OWNER" | "MEMBER">("MEMBER");
  const [phone, setPhone] = useState("+54 9 351 ");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!name.trim() || !email.trim() || !password) {
      setFormError("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear usuario");
      }

      setSuccessMessage(`Usuario ${data.user.name} (${data.user.email}) dado de alta con éxito.`);
      setUsers((prev) => [data.user, ...prev]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("MEMBER");
      setPhone("+54 9 351 ");
      setShowCreateModal(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (user.id === currentUser.id) {
      alert("No puede eliminar su propia cuenta activa.");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Está seguro que desea dar de baja al usuario "${user.name}" (${user.email})? Esta acción revocará su acceso inmediatamente.`
    );
    if (!confirmDelete) return;

    try {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar usuario");
      }
      setSuccessMessage(`Usuario ${user.name} dado de baja.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
      loadUsers();
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const term = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.phone && u.phone.includes(term))
    );
  }, [users, search]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      superadmins: users.filter((u) => u.role === "SUPERADMIN").length,
      owners: users.filter((u) => u.role === "OWNER").length,
      members: users.filter((u) => u.role === "MEMBER").length,
    };
  }, [users]);

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto">
      {/* ENCABEZADO INSTITUCIONAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            prefetch={true}
            className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:text-[#0B132B] shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-600" />
              Módulo Exclusivo Superadmin
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B132B] tracking-tight mt-1 flex items-center gap-2">
              <UserCog className="w-6 h-6 text-[#9A6E24]" strokeWidth={1.5} />
              <span>Padrón y Gestión de Usuarios</span>
            </h1>
            <p className="text-xs text-[#475569] font-normal">
              Esta sección solo es visible y operable por la cuenta administradora autorizada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            title="Refrescar lista desde la base de datos"
            className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] hover:text-[#0B132B] flex items-center justify-center shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#9A6E24] ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setFormError("");
            }}
            className="bg-[#0B132B] hover:bg-[#1C2541] text-white font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
            <span>Alta de Usuario</span>
          </button>
        </div>
      </div>

      {/* MENSAJES DE ÉXITO */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-[#166534] rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-xs text-[#166534] hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <span className="text-[10px] uppercase font-medium text-[#475569] block">Total Cuentas</span>
          <span className="text-2xl font-bold text-[#0B132B] tabular-nums mt-1 block">{stats.total}</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <span className="text-[10px] uppercase font-medium text-red-700 block">Superadmins</span>
          <span className="text-2xl font-bold text-red-700 tabular-nums mt-1 block">{stats.superadmins}</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <span className="text-[10px] uppercase font-medium text-[#0B132B] block">Titulares (Owner)</span>
          <span className="text-2xl font-bold text-[#0B132B] tabular-nums mt-1 block">{stats.owners}</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
          <span className="text-[10px] uppercase font-medium text-[#166534] block">Técnicos (Member)</span>
          <span className="text-2xl font-bold text-[#166534] tabular-nums mt-1 block">{stats.members}</span>
        </div>
      </div>

      {/* MODAL / FORMULARIO FLOTANTE PARA ALTA DE USUARIO */}
      {showCreateModal && (
        <div className="bg-white rounded-2xl p-6 border border-[#CBD5E1] shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-bold text-[#0B132B]">Registrar Nuevo Usuario en la Plataforma</h2>
              <p className="text-xs text-[#475569]">
                Defina las credenciales iniciales y el nivel de privilegios
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-xs text-[#475569] hover:text-[#0B132B] p-1.5 cursor-pointer"
            >
              Cerrar
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Ing. Carlos Pérez"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-normal text-[#0B132B] bg-[#F8FAFC] focus:bg-white focus:border-[#0B132B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                  Correo Electrónico (Login) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#475569] absolute left-3 top-3" strokeWidth={1.5} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@electrocba.com.ar"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-normal text-[#0B132B] bg-[#F8FAFC] focus:bg-white focus:border-[#0B132B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                  Contraseña Inicial *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#475569] absolute left-3 top-3" strokeWidth={1.5} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-normal text-[#0B132B] bg-[#F8FAFC] focus:bg-white focus:border-[#0B132B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                  Rol y Nivel de Privilegios *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#0B132B] bg-white"
                >
                  <option value="MEMBER">Técnico Ayudante (MEMBER) - Vista operativa de obras</option>
                  <option value="OWNER">Instalador Titular (OWNER) - Emite presupuestos y cobra</option>
                  <option value="SUPERADMIN">Superadministrador (SUPERADMIN) - Control total y gestión de usuarios</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-[#0B132B] mb-1">
                  Teléfono Móvil / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#475569] absolute left-3 top-3" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 9 351 123 4567"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-normal text-[#0B132B] bg-[#F8FAFC] focus:bg-white focus:border-[#0B132B]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#0B132B] hover:bg-[#1C2541] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Crear Cuenta</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTADO / TABLA DE USUARIOS */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0B132B]">Padrón Activo de Usuarios</h2>
            <p className="text-xs text-[#475569]">
              Mostrando {filteredUsers.length} de {users.length} cuentas registradas
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-[#F8FAFC] focus:bg-white focus:border-[#0B132B]"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#475569] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#9A6E24]" />
            <span>Cargando padrón de usuarios...</span>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredUsers.map((u) => {
              const isCurrentSession = u.id === currentUser.id;
              const isSuperadminRole = u.role === "SUPERADMIN";
              const isOwnerRole = u.role === "OWNER";

              return (
                <div
                  key={u.id}
                  className="p-4 sm:px-5 hover:bg-[#F8FAFC] transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                        isSuperadminRole
                          ? "bg-red-50 text-red-700 border-red-200"
                          : isOwnerRole
                          ? "bg-[#0B132B] text-white border-[#1C2541]"
                          : "bg-emerald-50 text-[#166534] border-emerald-200"
                      }`}
                    >
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#0B132B] truncate">{u.name}</span>
                        {isCurrentSession && (
                          <span className="text-[9px] uppercase font-bold bg-amber-50 text-[#9A6E24] border border-amber-200 px-1.5 py-0.2 rounded">
                            Tu Sesión Activa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#475569] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{u.email}</span>
                        {u.phone && (
                          <>
                            <span>•</span>
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0]">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        isSuperadminRole
                          ? "bg-red-50 text-red-700 border-red-200"
                          : isOwnerRole
                          ? "bg-slate-100 text-[#0B132B] border-slate-300"
                          : "bg-emerald-50 text-[#166534] border-emerald-200"
                      }`}
                    >
                      {isSuperadminRole ? "Superadmin" : isOwnerRole ? "Titular (Owner)" : "Técnico (Member)"}
                    </span>

                    {!isCurrentSession && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Dar de baja usuario"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
