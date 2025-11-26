# Guía de Inicio Rápido - ClientIntel Dashboard

## Para Nuevos Desarrolladores

Esta guía te permitirá entender y trabajar con el proyecto sin conocimiento previo.

---

## ¿Qué es este proyecto?

**ClientIntel Dashboard** es una aplicación MVP que genera dashboards de inteligencia de clientes para ventas B2B usando IA (LLM). Analiza clientes, vendors, servicios y oportunidades para generar análisis estratégicos completos.

---

## Setup en 5 Minutos

### 1. Instalar Dependencias

```bash
# Backend
cd CLIINT2/backend
npm install

# Frontend (otra terminal)
cd CLIINT2/frontend
npm install
```

### 2. Configurar API Key (Opcional)

**Con API Key**: Dashboard se genera con datos reales usando GPT-4o
**Sin API Key**: Dashboard se genera con datos fake (modo demo)

```bash
# Windows PowerShell
cd CLIINT2/backend
$env:OPENAI_API_KEY="tu-api-key-aqui"

# Linux/Mac
cd CLIINT2/backend
export OPENAI_API_KEY="tu-api-key-aqui"
```

### 3. Ejecutar

```bash
# Terminal 1: Backend
cd CLIINT2/backend
npm run dev
# → http://localhost:3001

# Terminal 2: Frontend
cd CLIINT2/frontend
npm run dev
# → http://localhost:3000
```

### 4. Probar

1. Abre `http://localhost:3000`
2. Haz clic en "Crear nuevo análisis de cliente"
3. El formulario viene pre-rellenado con datos de ejemplo (Indra, Telefónica)
4. Haz clic en "Generar Strategy Dashboard"
5. Espera ~60 segundos (con LLM) o instantáneo (sin LLM)
6. Verás el dashboard completo

---

## Estructura del Código

### Backend (`CLIINT2/backend/`)

```
src/
├── config/           # Configuración (env, LLM)
├── domain/           # Lógica de negocio
│   ├── models/       # Tipos TypeScript
│   ├── services/     # Servicios principales
│   ├── errors/       # Errores personalizados
│   └── validators/   # Validación Zod
├── http/             # API REST (Express)
│   └── routes/       # Endpoints
└── llm/              # Integración con OpenAI
    ├── client.ts     # Cliente OpenAI
    └── *Agent.ts     # Agentes especializados
```

### Frontend (`CLIINT2/frontend/`)

```
app/                  # Páginas Next.js
├── page.tsx          # Home
├── clients/new/      # Formulario creación
└── dashboard/[id]/   # Vista dashboard

components/           # Componentes React
├── dashboard/        # Cards del dashboard
└── ui/              # Componentes shadcn/ui

lib/                  # Utilidades
├── api.ts           # Cliente API
└── types.ts         # Tipos (copia de backend)
```

---

## Flujo Principal

```
Usuario → Formulario (/clients/new)
  ↓
POST /api/vendors/:vendorId/dashboard
  ↓
DashboardService.generateDashboard()
  ↓
¿Hay API Key?
  ├─ SÍ → generateLLMSections() → LLM Agents → Datos reales
  └─ NO → generateFakeSections() → Datos fake
  ↓
Guarda en memoria
  ↓
Retorna dashboard completo
  ↓
Frontend renderiza cards
```

---

## Componentes Clave

### 1. DashboardService (`backend/src/domain/services/dashboardService.ts`)

**¿Qué hace?**: Orquesta la generación completa del dashboard.

**Método principal**: `generateDashboard(input, onProgress?)`

**Flujo interno**:
1. Verifica cache
2. Si no hay cache:
   - Con API key → Llama a `generateLLMSections()`
   - Sin API key → Llama a `generateFakeSections()`
3. Guarda resultado
4. Retorna dashboard

### 2. LLM Agents (`backend/src/llm/`)

**ClientResearchAgent**: Analiza cliente
- Genera: AccountSnapshot, MarketContext, StrategicPriorities

**VendorResearchAgent**: Analiza vendor
- Genera: EvidencePack

**FitAndStrategyAgent**: Análisis estratégico
- Genera: StakeholderMap, CompetitiveLandscape, VendorFitAndPlays, GapsAndQuestions

**DeepResearchService**: Investigación profunda
- Usa web search nativo de GPT-4o
- Genera: Info empresa, competidores, noticias

### 3. Dashboard Cards (`frontend/components/dashboard/`)

Cada card renderiza una sección del dashboard:
- `OpportunitySummaryCard`: Resumen y KPIs
- `AccountSnapshotCard`: Info del cliente
- `MarketContextCard`: Contexto de mercado
- `StakeholderCard`: Stakeholders
- `CompetitiveCard`: Competidores
- `VendorFitCard`: Fit y plays
- `EvidenceCard`: Evidencias
- `GapsQuestionsCard`: Gaps y preguntas
- `NewsOfInterestCard`: Noticias
- `CriticalDatesCard`: Fechas críticas
- `OpportunityRequirementsCard`: Requisitos

---

## Qué es Fake vs Real

### Con API Key

✅ **REAL (8 secciones)**:
- Account Snapshot
- Market Context
- Stakeholder Map
- Competitive Landscape
- Vendor Fit & Plays
- Evidence Pack
- Gaps & Questions
- News of Interest (si funciona)

⚠️ **FAKE (3 secciones)**:
- Opportunity Summary (generado localmente)
- Opportunity Requirements (hardcoded)
- Critical Dates (hardcoded)

### Sin API Key

❌ **Todo es FAKE** (11 secciones)

**Indicador**: Campo `llmModelUsed` en dashboard:
- `"gpt-4o"` = Se usó LLM
- `"fake-data-generator"` = Todo fake

---

## Endpoints API

### Principales

- `POST /api/vendors/:vendorId/dashboard` - Generar dashboard
  - Query: `?stream=true` para progreso en tiempo real
- `GET /api/dashboard/:dashboardId` - Obtener dashboard
- `GET /api/dashboards` - Listar todos los dashboards

### CRUD

- `POST /api/vendors` - Crear vendor
- `POST /api/vendors/:vendorId/clients` - Crear cliente
- `POST /api/vendors/:vendorId/services` - Crear servicio

### Utilidades

- `GET /api/health` - Health check
- `GET /api/cache/stats` - Estadísticas de cache
- `DELETE /api/cache` - Limpiar cache

---

## Debugging

### Logs del Backend

Busca estos prefijos en la consola:

- `[DashboardService]` - Flujo principal
- `[ClientResearchAgent]` - Análisis cliente
- `[VendorResearchAgent]` - Análisis vendor
- `[FitAndStrategyAgent]` - Análisis estratégico
- `[DeepResearchService]` - Investigación profunda

### Errores Comunes

1. **"json" must contain the word 'json'**
   - **Causa**: Prompt no incluye "json" cuando se usa `response_format: { type: 'json_object' }`
   - **Solución**: Añadir "Responde SIEMPRE en formato JSON válido" al prompt

2. **Dashboard no se genera**
   - Verificar `OPENAI_API_KEY` (o aceptar datos fake)
   - Revisar logs del backend

3. **Cache no funciona**
   - El contexto de oportunidad debe ser idéntico
   - Cache key incluye hash del contexto

---

## Recursos

- **Arquitectura completa**: `docs/ARCHITECTURE.md`
- **Auditoría de datos**: `docs/AUDITORIA_DATOS.md`
- **Notas de implementación**: `docs/implementation-notes.md`
- **Especificación original**: `docs/client-intel-mvp-spec.md`

---

**¿Preguntas?** Revisa `docs/ARCHITECTURE.md` para información detallada.

