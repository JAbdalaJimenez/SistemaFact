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
```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Inicializar datos base (Seed)
Definir `SEED_SUPERADMIN_EMAIL` y `SEED_SUPERADMIN_PASSWORD` en el entorno antes de ejecutar:
```bash
npm run db:seed
```

### 5. Migración de usuarios existentes a Supabase Auth
Para vincular usuarios existentes en la tabla `users` que aún no posean `authUserId`:
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-users-to-supabase.ts --dry-run
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-users-to-supabase.ts
```

### 6. Iniciar Servidor de Desarrollo
```bash
npm run dev
```

---

## Licencia

Desarrollado para instaladores y profesionales técnicos electricistas de Córdoba, Argentina.
