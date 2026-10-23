# ElectroCba • SaaS Vertical para Instaladores Electricistas (Córdoba)

> Plataforma integral de presupuestos formales, órdenes de trabajo, matrícula ERSeP, generación documental (PDF y DOCX) y cobranza con Mercado Pago bajo el estándar de diseño **Architectural Executive & Legal Tech**.

---

## ⚡ Características Principales

### 1. Sistema de Autenticación y Multi-Tenancy (Seguridad & Roles)
- **Autenticación Segura con JWT y Cookies HTTP-Only**: Implementada con algoritmo HS256 (`jose`) y passwords hasheadas con `bcryptjs`.
- **Protección de Rutas por Middleware**: `src/middleware.ts` bloquea y redirige el acceso no autenticado a `/dashboard`, `/quotes/*`, `/customers/*` y `/jobs/*`.
- **Aislamiento Multi-Tenant**: Consultas de base de datos particionadas estrictamente por `organizationId` obtenido de la sesión.
- **Manejo de Roles**: Roles `OWNER` (Titular) y `MEMBER` (Técnico de cuadrilla) con credenciales de prueba listas para demostración.

### 2. Presupuestos y Contratos Formales (Normativa Córdoba y Argentina)
- **Membrete Legal Habilitante**:
  - Matrícula Habilitante ERSeP (Córdoba Cat. III - N° 14892).
  - CUIT del instalador y condición frente al IVA (Monotributo - Servicios Técnicos Especializados).
  - Domicilio legal en Córdoba Capital.
- **Discriminación de Partidas de Estilo Arquitectónico**:
  - **Mano de Obra Especializada**: Reglamentación AEA 90364, peinado de tableros en riel DIN, hincado de jabalinas y protocolo de medición.
  - **Provisión de Materiales con Sello IRAM**: Componentes normalizados con marcas homologadas (Schneider Acti9, Sica, Prysmian, cables antillama IRAM NM 247-3).
- **Cláusulas Contractuales y Legales Incorporadas**:
  - **Ley de Seguridad Eléctrica de Córdoba N° 10.281**: Emisión de Certificado de Instalación Eléctrica Apta.
  - **Ley Nacional N° 24.240 de Defensa del Consumidor** (Arts. 11 y 21): Garantía legal escrita de 6 meses sobre mano de obra y componentes.
  - **Cláusula Anti-Inflación**: Precios fijos por 15 días corridos.
  - **Condiciones de Pago**: Seña inicial del 50% para reserva de fecha y acopio de materiales; saldo restante contra conformidad de obra.
  - **Medios Habilitados**: Transferencia (Alias/CVU), Mercado Pago y efectivo con recibo oficial.

### 3. Motor Documental (PDF & DOCX), Vista Pública y WhatsApp
- **Exportación a PDF Vectorial** (`GET /api/quotes/[id]/export/pdf`): Compilación directa en backend con `pdf-lib` con membrete formal, tablas separadas, recuadro normativo y espacio de firma y sello.
- **Exportación a Word .DOCX** (`GET /api/quotes/[id]/export/docx`): Generación nativa con la librería `docx` con estilos corporativos y cláusulas editables.
- **Ficha Técnica Pública Web sin Login** (`/p/[publicToken]`): Enlace criptográfico UUID para que el cliente revise el desglose en el móvil y abone la seña del 50% mediante **Mercado Pago Checkout Pro**.
- **Integración con WhatsApp**: Botón de compartir con codificación URI y plantilla formal predefinida.

---

## 🎨 Identidad Visual: Architectural Executive & Legal Tech

- **Deep Obsidian (`#0F172A`)**: Color de poder en encabezados, superficies estructurales y botones primarios.
- **Dark Slate (`#1E293B`)**: Bordes oscuros, texto de alta jerarquía y barras de navegación.
- **Champagne Warm Gold (`#9A6E24` / `#C5A059`)**: Acento institucional para sellos ERSeP, líneas de precisión e importes totales destacados.
- **Off-white Slate (`#F8FAFC`) y Tarjetas `#FFFFFF`**: Fondos neutros con bordes sutiles de 1px en `#E2E8F0`.
- **Tipografía**: Plus Jakarta Sans con soporte de números tabulares (`tabular-nums`) para alineación contable de importes.

---

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 3
- **Base de Datos & ORM**: PostgreSQL + Prisma ORM
- **Autenticación**: JWT criptográfico (`jose`), `bcryptjs`, Cookies HTTP-Only
- **Pasarela de Pagos**: Mercado Pago SDK (Checkout Pro)
- **Generación Documental**: `pdf-lib` (PDF vectorial) y `docx` (Word formal)
- **Iconografía**: Lucide React
- **Entorno de Contenedores**: Docker Compose (PostgreSQL 16 Alpine)

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd sistemElectro
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de Entorno
Copiar el archivo de ejemplo:
```bash
cp .env.example .env
```
Configurar en `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/electrocba?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MERCADO_PAGO_ACCESS_TOKEN="TEST-your-access-token"
MERCADO_PAGO_PUBLIC_KEY="TEST-your-public-key"
```

### 4. Iniciar PostgreSQL con Docker
```bash
docker compose up -d
```

### 5. Sincronizar Base de Datos y Cargar Datos Iniciales (Seed)
```bash
npm run prisma:push
npm run db:seed
```

### 6. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 👤 Credenciales de Demostración (Multi-Tenant)

| Usuario | Correo | Contraseña | Rol | Organización |
| :--- | :--- | :--- | :--- | :--- |
| **Marcos Romero** | `marcos@electrocba.com.ar` | `electrocba2026` | `OWNER` | ElectroCba Servicios Eléctricos |
| **Nicolás Gómez** | `tecnico@electrocba.com.ar` | `tecnico2026` | `MEMBER` | ElectroCba Servicios Eléctricos |

---

## 📋 Enlaces Públicos de Demostración

- **Ficha Técnica Camila Ferrero (Nueva Córdoba)**: [http://localhost:3000/p/cba-presupuesto-camila-01](http://localhost:3000/p/cba-presupuesto-camila-01)
- **Descarga PDF Vectorial**: [http://localhost:3000/api/quotes/quote_camila_01/export/pdf](http://localhost:3000/api/quotes/quote_camila_01/export/pdf)
- **Descarga Word (.docx)**: [http://localhost:3000/api/quotes/quote_camila_01/export/docx](http://localhost:3000/api/quotes/quote_camila_01/export/docx)

---

## 📄 Licencia

Desarrollado para instaladores y profesionales técnicos electricistas de Córdoba, Argentina.
