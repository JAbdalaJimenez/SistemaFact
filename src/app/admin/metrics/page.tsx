import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAllPlatformMetricsRaw } from "@/lib/admin-metrics-raw";
import { MetricsDashboard } from "@/components/admin-metrics/metrics-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Métricas de Plataforma | ElectroCba",
  robots: { index: false, follow: false },
};

export default async function PlatformMetricsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/admin/metrics");
  }

  // Solo SUPERADMIN (validado contra la DB). Cualquier otro rol ve un 404: la ruta no existe para ellos.
  if (session.role !== "SUPERADMIN") {
    notFound();
  }

  const allMetrics = await getAllPlatformMetricsRaw();
  return <MetricsDashboard initialData={allMetrics.monthly} initialAllData={allMetrics} />;
}

