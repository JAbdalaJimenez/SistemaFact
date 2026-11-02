-- Migración RLS Idempotente y Estricta para ElectroCba
-- Deny-all estricto para anon y authenticated en todas las tablas de public (incluida _prisma_migrations).
-- Prisma conecta con postgres (superuser) y supabaseAdmin con service_role (bypassrls), sin verse afectados.

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Activar Row Level Security si no está activo
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);

        -- Revocar todos los privilegios a anon y authenticated
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', tbl.tablename);
    END LOOP;
END $$;

