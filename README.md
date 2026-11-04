# ElectroCba • SaaS Vertical para Instaladores Electricistas (Córdoba)

> Plataforma integral de presupuestos formales, órdenes de trabajo, matrícula ERSeP, generación documental (PDF y DOCX) y cobranza con Mercado Pago bajo el estándar de diseño **Architectural Executive & Legal Tech**.

---

## Características Principales

### 1. Sistema de Autenticación y Multi-Tenancy (Seguridad & Roles)
- **Autenticación centralizada con Supabase Auth (`@supabase/ssr`)**: Sesiones gestionadas mediante cookies seguras validadas en el servidor con `supabase.auth.getUser()`.
- **Autorización y Roles en Base de Datos (`Prisma`)**: Los roles (`SUPERADMIN`, `OWNER`, `MEMBER`) y la pertenencia a la organización (`organizationId`) residen exclusivamente en la tabla `User` de PostgreSQL vinculada por `authUserId` (nunca en `user_metadata`).
- **Aislamiento Multi-Tenant Estricto**: Todas las consultas de negocio filtran en el servidor por el `organizationId` de la sesión activa.
- **Row-Level Security (RLS)**: Activado en todas las tablas del esquema `public` con política *deny-all* para los roles `anon` y `authenticated` de PostgREST.

### 2. Presupuestos y Contratos Formales (Normativa Córdoba y Argentina)
- **Membrete Legal Habilitante**:
  - Matrícula Habilitante ERSeP (Ley Provincial N° 10.281).
  - CUIT del instalador y condición frente al IVA.
  - Domicilio legal en Córdoba Capital.
- **Discriminación de Partidas**:
  - **Mano de Obra Especializada**: Reglamentación AEA 90364, peinado de tableros en riel DIN, hincado de jabalinas y protocolo de medición.
  - **Provisión de Materiales con Sello IRAM**: Componentes normalizados.
- **Cláusulas Contractuales y Legales Incorporadas**:
  - **Ley de Seguridad Eléctrica de Córdoba N° 10.281**.
  - **Ley Nacional N° 24.240 de Defensa del Consumidor** (Arts. 11 y 21).
  - **Cláusula de Vigencia y Anti-Inflación**.
  - **Condiciones de Pago**: Seña inicial del 50% y saldo contra conformidad de obra.

### 3. Motor Documental (PDF & DOCX), Vista Pública y WhatsApp
- **Exportación a PDF Vectorial** (`GET /api/quotes/[id]/export/pdf`): Generación en servidor con `pdf-lib`.
- **Exportación a Word .DOCX** (`GET /api/quotes/[id]/export/docx`): Generación con `docx`.
- **Ficha Técnica Pública Web sin Login** (`/p/[publicToken]`): Enlace con token UUID para que el cliente revise el presupuesto y abone la seña mediante **Mercado Pago Checkout Pro**.

---

## Configuración de Seguridad en Supabase (Obligatorio en Producción)

1. **Deshabilitar el auto-registro público (Sign-Up)**:
   - En el panel de Supabase -> **Authentication** -> **Providers** -> **Email**, desactivar la opción **"Allow new users to sign up"** (o restringir mediante Auth Hook).
   - Las altas de usuarios se realizan únicamente por cuentas `SUPERADMIN` u `OWNER` desde `/dashboard/users` (que invoca `POST /api/users` con `SUPABASE_SERVICE_ROLE_KEY`).
2. **Service Role Key**:
   - La variable `SUPABASE_SERVICE_ROLE_KEY` **jamás** debe llevar el prefijo `NEXT_PUBLIC_`. Solo se utiliza en el servidor (`src/lib/supabase/admin.ts`).

---

## Instalación y Puesta en Marcha

### 1. Instalar dependencias
```bash
npm install
```

### 2. Variables de Entorno
Copiar el archivo de ejemplo y completar con las credenciales reales del entorno:
```bash
cp .env.example .env.local
```

### 3. Aplicar migraciones y generar cliente Prisma

> **Nota sobre `DIRECT_URL`**: Prisma Migrate requiere conexión directa a PostgreSQL (puerto 5432) sin pasar por el pooler de transacciones (puerto 6543). Asegúrese de configurar `DIRECT_URL` en su archivo `.env`.

**En una base de datos nueva (vacía)**:
```bash
npx prisma migrate deploy
npx prisma generate
```

**En una base de datos existente (creada previamente con `db push` o `supabase_init.sql`)**:
El orden obligatorio es marcar el baseline inicial y luego aplicar las migraciones incrementales:
1. Marcar la migración baseline inicial como ya aplicada para que Prisma no intente recrear las tablas existentes:
   ```bash
   npx prisma migrate resolve --applied 20260101000000_baseline
   ```
2. Aplicar las migraciones incrementales posteriores (`add_auth_user_id_to_users`, `unique_mp_payment_id`, `add_mp_webhook_secret`, `enable_rls_all_tables`):
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### 4. Inicializar datos base en Desarrollo (Seed)
El script de seed está bloqueado en producción (`NODE_ENV === "production"`) y exige `ALLOW_SEED_WIPE=true`, `SEED_SUPERADMIN_EMAIL` y `SEED_SUPERADMIN_PASSWORD`:
```bash
ALLOW_SEED_WIPE=true SEED_SUPERADMIN_PASSWORD="TuPasswordSeguro123!" npm run db:seed
```

### 5. Migración de usuarios existentes a Supabase Auth
Para vincular usuarios existentes en la tabla `users` que aún no posean `authUserId`:
```bash
# 1. Simulación sin cambios (dry-run)
npx tsx scripts/migrate-users-to-supabase.ts --dry-run

# 2. Ejecución real (imprime el host de DATABASE_URL y exige --yes; conserva el hash en password)
npx tsx scripts/migrate-users-to-supabase.ts --yes

# 3. Una vez verificado el login en Supabase Auth, limpiar los hashes legados de password
npx tsx scripts/migrate-users-to-supabase.ts --finalize --yes
```

### 6. Configuración de Pasarela Mercado Pago por Organización
Cada organización puede configurar sus propias credenciales en `/dashboard/settings`:
- **Access Token**: Token de producción o prueba de la cuenta de Mercado Pago del instalador.
- **Public Key**: Clave pública para inicializar componentes en el checkout frontend.
- **Webhook Secret**: Secreto HMAC de firma de notificaciones provisto por el panel de desarrollador de Mercado Pago para esa app (se almacena cifrado con AES-256-GCM).

En la URL de notificación de Mercado Pago (`notification_url`), el sistema envía `?orgId=<id>` para validar la firma HMAC con el secreto específico de la cuenta receptora.

Para cifrar tokens o secretos existentes que se encuentren en texto plano en la base de datos:
```bash
# Simulación sin cambios (dry-run):
npx tsx scripts/encrypt-existing-mp-tokens.ts

# Ejecución real:
npx tsx scripts/encrypt-existing-mp-tokens.ts --yes
```

### 7. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

---

## Licencia

Desarrollado para instaladores y profesionales técnicos electricistas de Córdoba, Argentina.
