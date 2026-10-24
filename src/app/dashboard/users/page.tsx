import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUsers } from "@/lib/services";
import { UsersManagerClient } from "./client";

export const metadata = {
  title: "Gestión de Usuarios | Superadmin ElectroCba",
  description: "Administración de usuarios, roles y credenciales del sistema",
};

export default async function UsersManagementPage() {
  const session = await getSession();

  // Protección estricta a nivel de servidor: Solo la cuenta SUPERADMIN puede ingresar
  if (!session || session.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const users = await getUsers();

  return <UsersManagerClient currentUser={session} initialUsers={users} />;
}
