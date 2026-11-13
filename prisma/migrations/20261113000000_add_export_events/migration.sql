-- Migración aditiva: registro de descargas de presupuestos para métricas de plataforma.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExportFormat') THEN
        CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'DOCX');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "export_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT,
    "format" "ExportFormat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "export_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "export_events_createdAt_idx" ON "export_events"("createdAt");
CREATE INDEX IF NOT EXISTS "export_events_organizationId_idx" ON "export_events"("organizationId");

-- RLS deny-all para roles de la Data API (consistente con la migración RLS global)
ALTER TABLE "export_events" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON TABLE public.export_events FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON TABLE public.export_events FROM authenticated';
    END IF;
END $$;

