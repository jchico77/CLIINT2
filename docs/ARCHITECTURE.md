# Arquitectura del Sistema - ClientIntel Dashboard MVP

## 📋 Índice

1. [Visión General](#visión-general)
2. [Independencia del Código](#independencia-del-código)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Flujo de Funcionamiento](#flujo-de-funcionamiento)
5. [Componentes Críticos](#componentes-críticos)
6. [Datos Fake vs Real](#datos-fake-vs-real)
7. [Guía para Nuevos Desarrolladores](#guía-para-nuevos-desarrolladores)

---

## Visión General

**ClientIntel Dashboard** es una aplicación MVP que genera dashboards de inteligencia de clientes para ventas B2B usando IA (LLM). El sistema analiza clientes, vendors, servicios y oportunidades para generar análisis estratégicos completos.

### Stack Tecnológico

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: Next.js 14 + TypeScript + React + TailwindCSS + shadcn/ui
- **IA**: OpenAI GPT-4o (opcional, con fallback a datos fake)
- **Almacenamiento**: En memoria (Map objects) - pendiente migración a BD

---

## Independencia del Código

### ✅ Confirmación de Independencia

**CLIINT2 es completamente independiente** de cualquier código fuera de su directorio. Verificación:

1. **Imports**: Todos los imports son relativos dentro de `CLIINT2/`
   - Backend: `import { X } from '../../domain/...'` (rutas relativas dentro de CLIINT2)
   - Frontend: `import { X } from '@/lib/...'` (alias `@` apunta a `CLIINT2/frontend/`)

2. **Dependencias**: Cada directorio (`backend/`, `frontend/`) tiene su propio `package.json` y `node_modules/`

3. **Configuración**: Cada parte tiene su propia configuración:
   - `backend/tsconfig.json`
   - `frontend/tsconfig.json`, `next.config.js`, `tailwind.config.js`

4. **Sin Referencias Externas**: No hay imports desde `../CLIINT/` o cualquier directorio padre

### Estructura de Directorios

```
CLIINT2/                          # Raíz del proyecto (completamente independiente)
├── backend/                      # Backend Node.js + Express
│   ├── src/
│   │   ├── config/              # Configuración (env, LLM)
│   │   ├── domain/               # Lógica de dominio
│   │   │   ├── models/           # Tipos TypeScript
│   │   │   ├── services/         # Servicios de negocio
│   │   │   ├── errors/           # Errores personalizados
│   │   │   ├── validators/       # Validación Zod
│   │   │   └── types/             # Tipos auxiliares
│   │   ├── http/                 # Capa HTTP (Express)
│   │   │   ├── routes/           # Rutas API
│   │   │   └── server.ts          # Servidor Express
│   │   └── llm/                   # Integración LLM
│   │       ├── client.ts          # Cliente OpenAI
│   │       ├── clientResearchAgent.ts
│   │       ├── vendorResearchAgent.ts
│   │       ├── fitAndStrategyAgent.ts
│   │       └── deepResearchService.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/                      # Frontend Next.js
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # Home
│   │   ├── clients/new/           # Formulario creación
│   │   ├── dashboard/[id]/        # Vista dashboard
│   │   └── opportunities/         # Lista oportunidades
│   ├── components/                # Componentes React
│   │   ├── dashboard/             # Cards del dashboard
│   │   ├── ui/                    # Componentes shadcn/ui
│   │   └── analysis-progress.tsx
│   ├── lib/                       # Utilidades
│   │   ├── api.ts                 # Cliente API
│   │   ├── types.ts               # Tipos (copia de backend)
│   │   └── utils.ts               # Helpers
│   ├── package.json
│   └── tsconfig.json
└── docs/                          # Documentación
    ├── ARCHITECTURE.md            # Este archivo
    ├── AUDITORIA_DATOS.md         # Qué es fake vs real
    ├── client-intel-mvp-spec.md   # Especificación original
    └── implementation-notes.md    # Notas de implementación
```

---

## Arquitectura del Sistema

### Capas de la Aplicación

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Pages      │  │  Components  │  │  API Client │   │
│  │  (App Router)│  │  (React)    │  │  (lib/api)  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP REST API
┌───────────────────────┴─────────────────────────────────┐
│                    BACKEND (Express)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         HTTP Layer (routes/)                      │  │
│  │  - /api/vendors, /api/clients, /api/dashboard    │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │                                  │
│  ┌───────────────────┴──────────────────────────────┐  │
│  │         Domain Layer (services/)                  │  │
│  │  - VendorService, ClientService, DashboardService │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │                                  │
│  ┌───────────────────┴──────────────────────────────┐  │
│  │         LLM Layer (llm/)                          │  │
│  │  - ClientResearchAgent                            │  │
│  │  - VendorResearchAgent                            │  │
│  │  - FitAndStrategyAgent                            │  │
│  │  - DeepResearchService                            │  │
│  └───────────────────┬──────────────────────────────┘  │
│                      │                                  │
│  ┌───────────────────┴──────────────────────────────┐  │
│  │         External Services                         │  │
│  │  - OpenAI API (GPT-4o)                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Separación de Responsabilidades

1. **Frontend**: Presentación, interacción usuario, llamadas API
2. **HTTP Layer**: Rutas, validación entrada, manejo errores HTTP
3. **Domain Layer**: Lógica de negocio, orquestación, validación dominio
4. **LLM Layer**: Integración con OpenAI, generación contenido IA
5. **External Services**: APIs externas (OpenAI)

---

## Flujo de Funcionamiento

### Flujo Completo: Creación de Dashboard

```
1. USUARIO → Frontend (/clients/new)
   └─> Completa formulario (Vendor, Client, Service, Context)

2. Frontend → POST /api/vendors/:vendorId/dashboard
   └─> Envía: { clientId, serviceOfferingId, opportunityContext }
   └─> Headers: Accept: text/event-stream (para progreso en tiempo real)

3. Backend (dashboard.ts) → Valida input con Zod
   └─> Si válido → DashboardService.generateDashboard()

4. DashboardService.generateDashboard()
   ├─> Verifica existencia: Vendor, Client, Service
   ├─> Verifica cache LLM (si existe, retorna inmediatamente)
   ├─> Si no hay cache:
   │   ├─> Si hay OPENAI_API_KEY:
   │   │   └─> Llama a generateLLMSections()
   │   └─> Si no hay API key:
   │       └─> Llama a generateFakeSections()
   └─> Guarda dashboard en memoria (Map)
   └─> Retorna dashboard completo

5. generateLLMSections() - Flujo LLM:
   ├─> Step 1: Deep Research (paralelo)
   │   ├─> deepResearchService.researchCompany() → Info cliente
   │   └─> (En paralelo) Client + Vendor research
   │       ├─> ClientResearchAgent.research()
   │       │   └─> Genera: AccountSnapshot, MarketContext, StrategicPriorities
   │       └─> VendorResearchAgent.research()
   │           └─> Genera: EvidencePack
   │
   ├─> Step 2: Competitive Research
   │   └─> deepResearchService.researchCompetitors()
   │
   ├─> Step 3: Fit & Strategy
   │   └─> FitAndStrategyAgent.generate()
   │       └─> Genera: StakeholderMap, CompetitiveLandscape, 
   │                  VendorFitAndPlays, GapsAndQuestions
   │
   ├─> Step 4: News Research
   │   └─> deepResearchService.researchNews()
   │       └─> Si falla → Usa generateFakeNewsOfInterest()
   │
   └─> Step 5: Combine + Generate fake sections
       ├─> opportunitySummary: generateOpportunitySummary() (local)
       ├─> opportunityRequirements: generateFakeOpportunityRequirements() (fake)
       └─> criticalDates: generateFakeCriticalDates() (fake)

6. DashboardService → Cache resultado LLM (24h TTL)

7. Backend → Stream progreso via SSE
   └─> Envía eventos: { stepId, status, message, progress }
   └─> Al final: { type: 'complete', dashboardId, dashboard }

8. Frontend → Recibe eventos SSE
   └─> Actualiza AnalysisProgress component
   └─> Al recibir 'complete' → Redirige a /dashboard/:id

9. Frontend (/dashboard/:id) → GET /api/dashboard/:id
   └─> Renderiza todas las cards del dashboard
```

### Flujo Detallado: Generación LLM

```
ClientResearchAgent.research(client, opportunityContext)
│
├─> 1. Deep Research (si disponible)
│   └─> deepResearchService.researchCompany()
│       └─> LLM Call: GPT-4o con web search
│           └─> Retorna: companyInfo, marketAnalysis, strategicInsights
│
├─> 2. Generar AccountSnapshot
│   └─> LLM Call: Prompt estructurado
│       └─> Input: client info + deep research results
│       └─> Output: JSON con AccountSnapshotSection
│
├─> 3. Generar MarketContext
│   └─> LLM Call: Prompt estructurado
│       └─> Input: client info + market analysis
│       └─> Output: JSON con MarketContextSection
│
└─> 4. Generar StrategicPriorities
    └─> LLM Call: Prompt estructurado
        └─> Input: client info + strategic insights
        └─> Output: JSON con StrategicPrioritiesSection
```

---

## Componentes Críticos

### Backend

#### 1. `DashboardService` (`backend/src/domain/services/dashboardService.ts`)

**Responsabilidad**: Orquestar la generación completa del dashboard.

**Métodos Clave**:
- `generateDashboard(input, onProgress?)`: Método principal
  - Decide: LLM vs Fake
  - Verifica cache
  - Llama a `generateLLMSections()` o `generateFakeSections()`
  - Guarda en memoria
- `generateLLMSections()`: Genera todas las secciones con LLM
- `generateFakeSections()`: Genera todas las secciones con datos fake
- `generateOpportunitySummary()`: Genera summary local (no LLM)
- `generateFakeOpportunityRequirements()`: Genera requisitos fake
- `generateFakeCriticalDates()`: Genera fechas fake
- `getById()`, `getAll()`, `getByVendorId()`: Recuperación

**Dependencias**:
- `ClientResearchAgent`
- `VendorResearchAgent`
- `FitAndStrategyAgent`
- `deepResearchService`
- `LLMCache`

#### 2. `ClientResearchAgent` (`backend/src/llm/clientResearchAgent.ts`)

**Responsabilidad**: Analizar cliente y generar 3 secciones.

**Métodos**:
- `research(client, opportunityContext)`: Método principal
  - Integra `deepResearchService.researchCompany()`
  - Genera: AccountSnapshot, MarketContext, StrategicPriorities
  - Usa `llmClient.generateJSON()` para respuestas estructuradas

**Prompts**: Incluyen instrucciones específicas para análisis B2B, estructura JSON esperada.

#### 3. `VendorResearchAgent` (`backend/src/llm/vendorResearchAgent.ts`)

**Responsabilidad**: Analizar vendor y generar evidencias.

**Métodos**:
- `research(vendor, service)`: Método principal
  - Analiza vendor y servicio
  - Genera: EvidencePack (casos de estudio, KPIs, testimonios)

#### 4. `FitAndStrategyAgent` (`backend/src/llm/fitAndStrategyAgent.ts`)

**Responsabilidad**: Análisis estratégico de encaje vendor-cliente.

**Métodos**:
- `generate(vendor, client, service, clientResearch, vendorResearch, opportunityContext)`: Método principal
  - Genera: StakeholderMap, CompetitiveLandscape, VendorFitAndPlays, GapsAndQuestions
  - Usa información de ClientResearch y VendorResearch como input

#### 5. `DeepResearchService` (`backend/src/llm/deepResearchService.ts`)

**Responsabilidad**: Investigación profunda usando capacidades nativas de GPT-4o.

**Métodos**:
- `researchCompany()`: Investigación profunda sobre empresa
  - Usa web search nativo de GPT-4o
  - Retorna: companyInfo, marketAnalysis, strategicInsights
- `researchCompetitors()`: Investigación de competidores
- `researchNews()`: Investigación de noticias relevantes

**Nota**: Requiere que los prompts incluyan la palabra "json" cuando se usa `response_format: { type: 'json_object' }`.

#### 6. `llmClient` (`backend/src/llm/client.ts`)

**Responsabilidad**: Cliente unificado para OpenAI.

**Métodos**:
- `generate(prompt, options?)`: Generación texto libre
- `generateJSON(prompt, options?)`: Generación JSON estructurado
  - Usa `response_format: { type: 'json_object' }`
  - Limpia respuesta (quita markdown code blocks)

#### 7. `LLMCache` (`backend/src/domain/services/llmCache.ts`)

**Responsabilidad**: Cache en memoria de resultados LLM.

**Características**:
- TTL: 24 horas
- Key: `vendorId:clientId:serviceId:contextHash`
- Métodos: `get()`, `set()`, `clearExpired()`, `clearAll()`, `getStats()`

### Frontend

#### 1. `AnalysisProgress` (`frontend/components/analysis-progress.tsx`)

**Responsabilidad**: Mostrar progreso en tiempo real durante generación.

**Props**:
- `steps: AnalysisStep[]`: Lista de pasos
- `currentStepIndex: number`: Paso actual

**Funcionalidad**: Muestra animación de progreso, mensajes de cada paso, estados (pending, in-progress, completed, error).

#### 2. Dashboard Cards (`frontend/components/dashboard/*.tsx`)

**Responsabilidad**: Renderizar cada sección del dashboard.

**Componentes**:
- `OpportunitySummaryCard`: Resumen oportunidad y KPIs
- `AccountSnapshotCard`: Snapshot del cliente
- `MarketContextCard`: Contexto de mercado
- `OpportunityRequirementsCard`: Requisitos y scope
- `StakeholderCard`: Mapa de stakeholders
- `CompetitiveCard`: Paisaje competitivo
- `VendorFitCard`: Fit y plays estratégicos
- `EvidenceCard`: Evidencias del vendor
- `GapsQuestionsCard`: Gaps y preguntas
- `NewsOfInterestCard`: Noticias relevantes
- `CriticalDatesCard`: Fechas críticas

**Características**:
- Usan componentes shadcn/ui (Card, Table, Badge, Progress, Tabs)
- Soporte dark mode
- Layout compacto y denso

#### 3. API Client (`frontend/lib/api.ts`)

**Responsabilidad**: Cliente HTTP para comunicarse con backend.

**Funciones Clave**:
- `createDashboardWithProgress()`: Crea dashboard con SSE para progreso
  - Usa `fetch` con `ReadableStream`
  - Parsea eventos SSE
  - Llama callback `onProgress` para cada evento
- `getDashboard()`, `getAllDashboards()`, etc.: Funciones CRUD estándar

---

## Datos Fake vs Real

### Resumen Ejecutivo

**Con API Key de OpenAI configurada**:
- ✅ **8 secciones REALES** (generadas por LLM)
- ⚠️ **3 secciones FAKE** (hardcoded)

**Sin API Key**:
- ❌ **0 secciones REALES**
- ⚠️ **11 secciones FAKE** (todo hardcoded)

### Detalle por Sección

| Sección | Con API Key | Sin API Key | Generador | Notas |
|---------|-------------|-------------|-----------|-------|
| **Account Snapshot** | ✅ REAL | ❌ FAKE | ClientResearchAgent | LLM con deep research |
| **Opportunity Summary** | ⚠️ FAKE | ❌ FAKE | `generateOpportunitySummary()` | Generado localmente, no LLM |
| **Market Context** | ✅ REAL | ❌ FAKE | ClientResearchAgent | LLM con deep research |
| **Opportunity Requirements** | ⚠️ FAKE | ❌ FAKE | `generateFakeOpportunityRequirements()` | Siempre hardcoded |
| **Stakeholder Map** | ✅ REAL | ❌ FAKE | FitAndStrategyAgent | LLM |
| **Competitive Landscape** | ✅ REAL | ❌ FAKE | FitAndStrategyAgent | LLM con deep research |
| **Vendor Fit & Plays** | ✅ REAL | ❌ FAKE | FitAndStrategyAgent | LLM |
| **Evidence Pack** | ✅ REAL | ❌ FAKE | VendorResearchAgent | LLM |
| **Gaps & Questions** | ✅ REAL | ❌ FAKE | FitAndStrategyAgent | LLM |
| **News of Interest** | ✅ REAL* | ❌ FAKE | DeepResearchService | *Si falla → fake |
| **Critical Dates** | ⚠️ FAKE | ❌ FAKE | `generateFakeCriticalDates()` | Siempre hardcoded |

### Indicadores

**Campo `llmModelUsed` en dashboard**:
- `"gpt-4o"`: Se usó LLM (8/11 secciones reales)
- `"fake-data-generator"`: Todo es fake (0/11 reales)

**Logs del backend**:
- `[DashboardService] Using LLM agents...` → LLM activo
- `[DashboardService] No LLM API key, using fake data` → Fake activo
- `[DashboardService] Using cached LLM results` → Cache hit

### Fallback Automático

Si LLM falla en cualquier punto:
1. Se captura el error
2. Se emite evento de progreso con status 'error'
3. Se usa `generateFakeSections()` para la sección fallida o todo el dashboard
4. El flujo continúa (no se rompe)

---

## Guía para Nuevos Desarrolladores

### Prerrequisitos

1. **Node.js 18+** y npm instalados
2. **OpenAI API Key** (opcional, para usar LLM)
3. **Conocimientos básicos**: TypeScript, React, Express

### Setup Inicial

```bash
# 1. Instalar dependencias
cd CLIINT2/backend
npm install

cd ../frontend
npm install

# 2. Configurar API key (opcional)
cd ../backend
# Windows PowerShell:
$env:OPENAI_API_KEY="tu-api-key"
# Linux/Mac:
export OPENAI_API_KEY="tu-api-key"

# 3. Ejecutar backend
npm run dev  # http://localhost:3001

# 4. Ejecutar frontend (otra terminal)
cd ../frontend
npm run dev  # http://localhost:3000
```

### Puntos de Entrada

1. **Backend**: `backend/src/http/server.ts`
   - Punto de entrada del servidor Express
   - Registra todas las rutas

2. **Frontend**: `frontend/app/page.tsx`
   - Página principal
   - Redirige a `/clients/new` para crear análisis

3. **Generación Dashboard**: `backend/src/domain/services/dashboardService.ts`
   - Método `generateDashboard()`: Lógica principal

### Flujo de Desarrollo Típico

1. **Añadir nueva sección al dashboard**:
   - Añadir tipo en `backend/src/domain/models/clientIntelDashboard.ts`
   - Generar en `DashboardService.generateLLMSections()`
   - Crear componente en `frontend/components/dashboard/`
   - Añadir a `frontend/app/dashboard/[id]/page.tsx`

2. **Modificar agente LLM**:
   - Editar archivo en `backend/src/llm/`
   - Ajustar prompts según necesidad
   - Probar con API key configurada

3. **Añadir endpoint API**:
   - Crear ruta en `backend/src/http/routes/`
   - Registrar en `backend/src/http/server.ts`
   - Añadir función en `frontend/lib/api.ts`

### Convenciones de Código

1. **TypeScript strict**: Todos los archivos usan TypeScript strict
2. **Sin CSS inline**: Todo estilo con TailwindCSS o CSS centralizado
3. **Separación de capas**: Domain → HTTP → LLM
4. **Manejo de errores**: Usar `AppError` y clases derivadas
5. **Validación**: Zod para validar inputs

### Testing

**Estado actual**: No hay tests implementados (pendiente Fase 6)

**Para añadir tests**:
- Backend: Jest o Vitest
- Frontend: React Testing Library
- Mock LLM: Mock `llmClient` y `deepResearchService`

### Debugging

**Logs del backend**:
- `[DashboardService]`: Logs principales
- `[ClientResearchAgent]`: Logs de análisis cliente
- `[VendorResearchAgent]`: Logs de análisis vendor
- `[FitAndStrategyAgent]`: Logs de análisis estratégico
- `[DeepResearchService]`: Logs de investigación profunda

**Frontend**:
- React DevTools para inspeccionar componentes
- Network tab para ver llamadas API
- Console para errores

### Problemas Comunes

1. **Error "json" en prompts**:
   - Cuando uses `response_format: { type: 'json_object' }`, el prompt debe contener "json" o "JSON"
   - Solución: Añadir "Responde SIEMPRE en formato JSON válido" al prompt

2. **Dashboard no se genera**:
   - Verificar que `OPENAI_API_KEY` esté configurada (o aceptar datos fake)
   - Revisar logs del backend para errores

3. **Cache no funciona**:
   - Verificar que el contexto de oportunidad sea idéntico
   - Cache key incluye hash del contexto (primeros 200 chars)

---

## Referencias

- **Especificación Original**: `docs/client-intel-mvp-spec.md`
- **Notas de Implementación**: `docs/implementation-notes.md`
- **Auditoría de Datos**: `docs/AUDITORIA_DATOS.md`
- **README Principal**: `README.md`

---

**Última actualización**: Noviembre 2025
**Versión**: MVP - Fase 5 completada

