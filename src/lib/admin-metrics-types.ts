// Tipos compartidos (seguros para cliente) del Dashboard de Métricas de Plataforma.

export type MetricsRange = "daily" | "weekly" | "monthly";

export const METRICS_RANGES: MetricsRange[] = ["daily", "weekly", "monthly"];

export interface UsagePoint {
  label: string;
  customers: number;
}

export interface RankedMaterial {
  name: string;
  quantity: number;
  quotes: number;
}

export interface RankedUser {
  organizationId: string;
  name: string;
  quotes: number;
  totalAmount: number;
}

export interface PlatformMetrics {
  range: MetricsRange;
  generatedAt: string;
  activeElectricians: { value: number; label: "DAU" | "WAU" | "MAU" };
  theoreticalGmv: number;
  paymentConversion: { percentage: number; paidQuotes: number; totalQuotes: number };
  customerGrowth: UsagePoint[];
  exportPreference: { pdf: number; docx: number };
  topMaterials: RankedMaterial[];
  topUsers: RankedUser[];
}

