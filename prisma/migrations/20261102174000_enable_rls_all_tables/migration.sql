-- Migración RLS Idempotente y Robusta para ElectroCba
-- Compatible con PostgreSQL estándar (sin roles de Supabase) y con Supabase / PostgREST.
-- Deny-all estricto para anon y authenticated en todas las tablas de public (incluida _prisma_migrations).
-- Prisma conecta con postgres (superuser) y supabaseAdmin con service_role (bypassrls), sin verse afectados.

DO $$
DECLARE
    tbl RECORD;
    role_rec RECORD;
    has_anon BOOLEAN := FALSE;
    has_authenticated BOOLEAN := FALSE;
BEGIN
    -- 1. Verificar si existen los roles anon / authenticated en pg_roles
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') INTO has_anon;
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') INTO has_authenticated;

    -- 2. Activar Row Level Security y revocar privilegios tabla por tabla
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- Activar Row Level Security si no está activo
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);

        -- Revocar condicionalmente según la existencia de cada rol
        IF has_anon THEN
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', tbl.tablename);
        END IF;

        IF has_authenticated THEN
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated;', tbl.tablename);
        END IF;
    END LOOP;

    -- 3. Revocar privilegios por defecto futuros (ALTER DEFAULT PRIVILEGES) en tablas y secuencias
    IF has_anon THEN
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;';
    END IF;

    IF has_authenticated THEN
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;';
    END IF;
END $$;
