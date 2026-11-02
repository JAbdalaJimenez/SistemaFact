import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUsers } from "@/lib/services";
import { UsersManagerClient } from "./client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Gestión de Usuarios | ElectroCba",
  description: "Administración de usuarios, roles y credenciales del sistema",
};

export default async function UsersManagementPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/dashboard/users");
  }

  if (session.role !== "SUPERADMIN" && session.role !== "OWNER") {
    redirect("/dashboard");
  }

  const filterOrgId = session.role === "SUPERADMIN" ? undefined : session.organizationId;
  const users = await getUsers(filterOrgId);

  return <UsersManagerClient currentUser={session} initialUsers={users} />;
}
