-- =====================================================================
-- Script de Inicialización de Tablas para Supabase PostgreSQL (ElectroCba)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'OWNER', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "JobStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'MERCADO_PAGO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QuoteItemType" AS ENUM ('LABOR', 'MATERIALS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLAS

CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "ersepLicenseNumber" TEXT,
    "ersepLicense" TEXT,
    "cuit" TEXT,
    "vatCondition" TEXT NOT NULL DEFAULT 'Monotributo',
    "taxCondition" TEXT NOT NULL DEFAULT 'Monotributo - Prestador de Servicios',
    "legalAddress" TEXT,
    "address" TEXT,
    "phone" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "bankAlias" TEXT,
    "cbuCvu" TEXT,
    "aliasCbu" TEXT,
    "mpAccessToken" TEXT,
    "mpPublicKey" TEXT,
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "services" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defaultPrice" INTEGER NOT NULL,
    "type" "QuoteItemType" NOT NULL DEFAULT 'LABOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quotes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "quoteNumber" TEXT,
    "title" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "depositPercentage" INTEGER NOT NULL DEFAULT 50,
    "validityDays" INTEGER NOT NULL DEFAULT 10,
    "expiresAt" TIMESTAMP(3),
    "totalAmount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" "QuoteItemType" NOT NULL DEFAULT 'LABOR',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "title" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "totalAmount" INTEGER NOT NULL,
    "balanceDue" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'APPROVED',
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- 3. ÍNDICES
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX IF NOT EXISTS "customers_organizationId_idx" ON "customers"("organizationId");
CREATE INDEX IF NOT EXISTS "customers_neighborhood_idx" ON "customers"("neighborhood");
CREATE INDEX IF NOT EXISTS "services_organizationId_idx" ON "services"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_publicToken_key" ON "quotes"("publicToken");
CREATE INDEX IF NOT EXISTS "quotes_organizationId_idx" ON "quotes"("organizationId");
CREATE INDEX IF NOT EXISTS "quotes_customerId_idx" ON "quotes"("customerId");
CREATE INDEX IF NOT EXISTS "quotes_publicToken_idx" ON "quotes"("publicToken");
CREATE INDEX IF NOT EXISTS "quote_items_quoteId_idx" ON "quote_items"("quoteId");
CREATE INDEX IF NOT EXISTS "quote_items_itemType_idx" ON "quote_items"("itemType");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_quoteId_key" ON "jobs"("quoteId");
CREATE INDEX IF NOT EXISTS "jobs_organizationId_idx" ON "jobs"("organizationId");
CREATE INDEX IF NOT EXISTS "jobs_customerId_idx" ON "jobs"("customerId");
CREATE INDEX IF NOT EXISTS "jobs_status_idx" ON "jobs"("status");
CREATE INDEX IF NOT EXISTS "payments_organizationId_idx" ON "payments"("organizationId");
CREATE INDEX IF NOT EXISTS "payments_jobId_idx" ON "payments"("jobId");
CREATE INDEX IF NOT EXISTS "payments_mpPaymentId_idx" ON "payments"("mpPaymentId");

-- 4. FOREIGN KEYS
DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "services" ADD CONSTRAINT "services_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. DATOS BASE (ORGANIZACIÓN Y SERVICIOS INICIALES)
INSERT INTO "organizations" ("id", "name", "slug", "legalName", "ersepLicenseNumber", "ersepLicense", "cuit", "vatCondition", "taxCondition", "legalAddress", "address", "phone", "whatsappNumber", "bankAlias", "cbuCvu", "aliasCbu", "currency", "createdAt", "updatedAt")
VALUES (
  'org_electrocba_cba01',
  'ElectroCba - Soluciones Eléctricas',
  'electrocba',
  'Instalador Electricista Habilitado',
  'Habilitación ERSeP Ley 10.281',
  'Habilitación ERSeP Ley 10.281',
  '20-00000000-0',
  'Monotributo',
  'Monotributo - Prestador de Servicios',
  'Córdoba Capital, Provincia de Córdoba',
  'Córdoba Capital, Provincia de Córdoba',
  '+54 9 351 000-0000',
  '+5493510000000',
  'ELECTROCBA.MP',
  '0000003100010000000000',
  'ELECTROCBA.MP',
  'ARS',
  NOW(),
  NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "services" ("id", "organizationId", "title", "description", "defaultPrice", "type", "createdAt", "updatedAt")
VALUES
  ('srv_01', 'org_electrocba_cba01', 'Instalación de Disyuntor Diferencial 2x40A 30mA', 'Colocación y calibrado en riel DIN con prueba de disparo bajo norma AEA 90364', 45000, 'LABOR', NOW(), NOW()),
  ('srv_02', 'org_electrocba_cba01', 'Instalación de Jabalina + Protocolo ERSeP Ley 10.281', 'Hincado jabalina 1.5m cobre, caja de inspección y certificado firmado', 95000, 'LABOR', NOW(), NOW()),
  ('srv_03', 'org_electrocba_cba01', 'Recableado por Boca de Luz / Tomacorriente', 'Reemplazo de conductores antiguos por cables IRAM NM 247-3 ignífugos', 18000, 'LABOR', NOW(), NOW()),
  ('srv_04', 'org_electrocba_cba01', 'Adecuación Tablero Seccional y Térmicas Bipolares', 'Reemplazo de llaves viejas, peines bipolares y balanceo de fases', 65000, 'LABOR', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
