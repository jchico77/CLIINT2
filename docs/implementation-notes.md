# Implementation Notes - ClientIntel Dashboard MVP

## Fase 1 - Esqueleto de Proyecto y Dominio Básico ✅

### Implementado

1. **Estructura del proyecto CLIINT2/**
   - Directorio `backend/` con estructura TypeScript
   - Directorio `frontend/` con Next.js 14
   - Directorio `docs/` con documentación

2. **Backend - Configuración Base**
   - `package.json` con dependencias: Express, TypeScript, Zod
   - `tsconfig.json` con configuración strict
   - `src/config/env.ts` para variables de entorno
   - `src/http/server.ts` con servidor Express y CORS configurado

3. **Backend - Tipos de Dominio**
   - `src/domain/models/vendor.ts` - Tipo Vendor
   - `src/domain/models/serviceOffering.ts` - Tipo ServiceOffering
   - `src/domain/models/clientAccount.ts` - Tipo ClientAccount
   - `src/domain/models/clientIntelDashboard.ts` - Tipos completos del dashboard:
     - AccountSnapshotSection
     - MarketContextSection
     - StrategicPrioritiesSection
     - StakeholderMapSection
     - CompetitiveLandscapeSection
     - VendorFitAndPlaysSection
     - EvidencePackSection
     - GapsAndQuestionsSection
     - ClientIntelDashboardSections (agregado de todas las secciones)
     - ClientIntelDashboard (tipo completo)

4. **Backend - Endpoint de Health**
   - `src/http/routes/health.ts` - GET /api/health
   - Retorna status, timestamp y nombre del servicio

5. **Frontend - Configuración Base**
   - `package.json` con Next.js 14, React, TailwindCSS, Tremor
   - `tsconfig.json` con configuración strict
   - `tailwind.config.js` con configuración completa
   - `app/globals.css` con variables CSS para tema
   - `app/layout.tsx` con layout base

6. **Frontend - Tipos Compartidos**
   - `lib/types.ts` - Copia de todos los tipos del backend
   - Mantiene sincronización manual (no importación directa)

7. **Frontend - Página Home**
   - `app/page.tsx` - Página principal
   - Llama a `/api/health` y muestra el estado
   - Botón para crear nuevo análisis

8. **Frontend - Componentes UI Base**
   - `components/ui/button.tsx` - Componente Button
   - `components/ui/card.tsx` - Componentes Card
   - `lib/utils.ts` - Utilidades (cn function para clases)

### Decisiones Técnicas

1. **Framework Backend**: Express (simple y directo para MVP)
2. **Almacenamiento**: En memoria para Fase 1 y 2 (Map objects)
3. **Validación**: Zod para schemas (preparado para futuro)
4. **Frontend Framework**: Next.js 14 con App Router
5. **Estilos**: TailwindCSS exclusivamente, sin CSS inline
6. **Tipos**: TypeScript strict en ambos proyectos
7. **Separación**: Tipos copiados, no importados entre frontend/backend

### Cómo Ejecutar

```bash
# Backend
cd CLIINT2/backend
npm install
npm run dev
# Servidor en http://localhost:3001

# Frontend (en otra terminal)
cd CLIINT2/frontend
npm install
npm run dev
# Frontend en http://localhost:3000
```

### Pruebas

1. Acceder a `http://localhost:3000`
2. Verificar que el backend está conectado (debe mostrar "Backend is healthy")
3. Verificar que el botón "Crear nuevo análisis de cliente" está visible

---

## Fase 2 - Endpoints Dominio + JSON Fake Dashboard ✅

### Implementado

1. **Backend - Servicios de Dominio**
   - `src/domain/services/vendorService.ts` - CRUD vendors (en memoria)
   - `src/domain/services/clientService.ts` - CRUD clients (en memoria)
   - `src/domain/services/serviceOfferingService.ts` - CRUD services (en memoria)
   - `src/domain/services/dashboardService.ts` - Generación de dashboard fake

2. **Backend - Rutas HTTP**
   - `src/http/routes/vendors.ts` - POST/GET vendors
   - `src/http/routes/clients.ts` - POST/GET clients (con filtro por vendorId)
   - `src/http/routes/services.ts` - POST/GET services (con filtro por vendorId)
   - `src/http/routes/dashboard.ts` - POST /api/vendors/:vendorId/dashboard y GET /api/dashboard/:dashboardId

3. **Backend - Generador de Dashboard Fake**
   - Función `generateFakeDashboard()` que crea un dashboard completo
   - Todas las 8 secciones con datos ficticios pero estructura válida:
     - AccountSnapshot con métricas clave
     - MarketContext con tendencias y eventos
     - StrategicPriorities con prioridades y pain points
     - StakeholderMap con stakeholders y sus características
     - CompetitiveLandscape con competidores y alternativas
     - VendorFitAndPlays con fit score, dimensiones y plays recomendados
     - EvidencePack con evidencias de diferentes tipos
     - GapsAndQuestions con gaps y preguntas inteligentes

4. **Frontend - Helpers API**
   - `lib/api.ts` - Funciones para todos los endpoints:
     - createVendor, getVendor
     - createService, getServices, getService
     - createClient, getClients, getClient
     - createDashboard, getDashboard
     - getHealth

5. **Frontend - Página de Creación**
   - `app/clients/new/page.tsx` - Formulario completo:
     - Sección Vendor (crear nuevo o usar existente)
     - Sección Client (crear nuevo o seleccionar existente)
     - Sección Service (crear nuevo o seleccionar existente)
     - Campo opportunityContext (textarea)
     - Validación y manejo de errores
     - Estado de carga durante generación
     - Redirección automática al dashboard generado

6. **Frontend - Componentes de Dashboard Cards**
   - `components/dashboard/AccountSnapshotCard.tsx` - Muestra snapshot de la cuenta
   - `components/dashboard/MarketContextCard.tsx` - Muestra contexto de mercado
   - `components/dashboard/PrioritiesCard.tsx` - Muestra prioridades estratégicas
   - `components/dashboard/StakeholderCard.tsx` - Muestra mapa de stakeholders
   - `components/dashboard/CompetitiveCard.tsx` - Muestra paisaje competitivo
   - `components/dashboard/VendorFitCard.tsx` - Muestra fit y plays
   - `components/dashboard/EvidenceCard.tsx` - Muestra evidencias con botón copiar
   - `components/dashboard/GapsQuestionsCard.tsx` - Muestra gaps y preguntas con botón copiar

7. **Frontend - Página de Dashboard**
   - `app/dashboard/[id]/page.tsx` - Vista completa del dashboard:
     - Fetch del dashboard por ID
     - Renderizado de las 8 cards en grid responsive
     - Estados de carga y error
     - Navegación de vuelta al inicio

### Decisiones Técnicas

1. **Almacenamiento**: Continúa en memoria (Map objects) - será reemplazado por DB en futuras fases
2. **Generación Fake**: Datos realistas pero ficticios que respetan 100% la estructura de tipos
3. **UI/UX**: Cards con diseño limpio usando Tailwind, sin CSS inline
4. **Navegación**: Next.js App Router con routing dinámico
5. **Estados**: Manejo de loading y error en todas las páginas
6. **Formulario**: Permite crear nuevos o seleccionar existentes para vendor/client/service

### Cómo Ejecutar

```bash
# Backend (debe estar corriendo)
cd CLIINT2/backend
npm run dev

# Frontend (en otra terminal)
cd CLIINT2/frontend
npm run dev
```

### Pruebas

1. **Flujo Completo**:
   - Ir a `http://localhost:3000`
   - Clic en "Crear nuevo análisis de cliente"
   - Completar formulario:
     - Vendor: Nombre "Mi Empresa", Website "https://miempresa.com"
     - Client: Nombre "Cliente Test", Website "https://clientetest.com"
     - Service: Nombre "Servicio Test", Descripción "Descripción del servicio"
     - Contexto: "Esta es una oportunidad de prueba"
   - Clic en "Generar Strategy Dashboard"
   - Debe redirigir a `/dashboard/:id` y mostrar todas las cards

2. **Verificar Cards**:
   - Account Snapshot muestra datos del cliente
   - Market Context muestra tendencias y eventos
   - Strategic Priorities muestra prioridades con barras de relevancia
   - Stakeholder Map muestra tabla de stakeholders
   - Competitive Landscape muestra competidores
   - Vendor Fit muestra fit score y plays
   - Evidence Pack muestra evidencias con botón copiar funcional
   - Gaps & Questions muestra gaps y preguntas con botón copiar funcional

3. **Funcionalidad de Copiar**:
   - En Evidence Card: Clic en "Copiar snippet" debe copiar el texto
   - En Gaps & Questions: Clic en "Copiar" debe copiar la pregunta


### Notas

- Todos los datos son fake pero la estructura es 100% correcta
- El dashboard se genera instantáneamente (sin LLM aún)
- La UI es completamente funcional y responsive
- No hay CSS inline en ningún componente

---

---

## Fase 3 - Integración LLM (Client & Vendor Research) ✅

### Implementado

1. **Configuración LLM**
   - `src/config/llm.ts` - Configuración de cliente LLM con variables de entorno
   - Soporte para OpenAI API (GPT-4o)
   - Variables: `OPENAI_API_KEY`, `LLM_MODEL`, `LLM_TEMPERATURE`

2. **Cliente LLM**
   - `src/llm/client.ts` - Cliente unificado para OpenAI
   - Métodos `generate()` y `generateJSON()` para respuestas estructuradas
   - Manejo de errores y limpieza de respuestas JSON

3. **ClientResearchAgent**
   - `src/llm/clientResearchAgent.ts` - Agente para análisis de clientes
   - Genera: `accountSnapshot`, `marketContext`, `strategicPriorities`
   - Prompts estructurados para análisis B2B
   - Output en formato JSON validado

4. **VendorResearchAgent**
   - `src/llm/vendorResearchAgent.ts` - Agente para análisis de vendors
   - Extrae: `serviceOfferings`, `differentiators`, `evidence`
   - Análisis de web corporativa y servicios
   - Generación de evidencias relevantes

5. **Integración en DashboardService**
   - Método `generateDashboard()` que usa LLM cuando está disponible
   - Fallback automático a datos fake si LLM falla o no hay API key
   - Logging detallado del proceso
   - Secciones generadas con LLM:
     - ✅ Account Snapshot (LLM)
     - ✅ Market Context (LLM)
     - ✅ Strategic Priorities (LLM)
     - ✅ Evidence Pack (LLM)
     - ⏳ Stakeholder Map (fake, pendiente Fase 4)
     - ⏳ Competitive Landscape (fake, pendiente Fase 4)
     - ⏳ Vendor Fit & Plays (fake, pendiente Fase 4)
     - ⏳ Gaps & Questions (fake, pendiente Fase 4)

### Decisiones Técnicas

1. **Modelo LLM**: GPT-4o (configurable vía `LLM_MODEL`)
2. **Structured Outputs**: Uso de `response_format: { type: 'json_object' }` para garantizar JSON válido
3. **Fallback**: Si LLM falla, se usa datos fake automáticamente (no rompe el flujo)
4. **Paralelismo**: ClientResearch y VendorResearch se ejecutan en paralelo para mejor rendimiento
5. **Logging**: Console.log detallado para debugging (sin exponer API keys)

### Configuración

Para usar LLM, configurar variable de entorno:

```bash
# Windows PowerShell
$env:OPENAI_API_KEY="your_openai_api_key_here"

# Linux/Mac
export OPENAI_API_KEY="your_openai_api_key_here"
```

O crear archivo `.env` en `CLIINT2/backend/`:
```
OPENAI_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4o
LLM_TEMPERATURE=0.4
```

### Cómo Probar

1. Configurar `OPENAI_API_KEY` como variable de entorno
2. Reiniciar el servidor backend
3. Crear un nuevo dashboard desde el frontend
4. Verificar en logs del backend que se usa LLM:
   - `[DashboardService] Using LLM agents to generate dashboard...`
   - `[ClientResearchAgent] Analizando cliente: ...`
   - `[VendorResearchAgent] Analizando vendor: ...`
   - `[DashboardService] ✓ Dashboard generated with LLM`

### Notas

- Los datos generados con LLM son reales y específicos del cliente/vendor
- El tiempo de generación aumenta significativamente (30-60 segundos vs instantáneo)
- Se mantiene compatibilidad: si no hay API key, funciona con datos fake
- El campo `llmModelUsed` en el dashboard indica qué modelo se usó
- **Actualización Fase 4**: Todas las secciones ahora se generan con LLM (ver Fase 4)

---

## Fase 4 - Fit & Strategy Agent + Completar Dashboard ✅

### Implementado

1. **FitAndStrategyAgent**
   - `src/llm/fitAndStrategyAgent.ts` - Agente estratégico completo
   - Genera las 4 secciones restantes del dashboard:
     - Stakeholder Map
     - Competitive Landscape
     - Vendor Fit & Plays
     - Gaps & Questions
   - Usa información de ClientResearch y VendorResearch como input
   - Modelo: GPT-4o con 6000 tokens máximo

2. **Integración Completa**
   - `dashboardService.generateLLMSections()` ahora usa 3 agentes:
     - ClientResearchAgent → Account Snapshot, Market Context, Strategic Priorities
     - VendorResearchAgent → Evidence Pack
     - FitAndStrategyAgent → Stakeholder Map, Competitive Landscape, Vendor Fit & Plays, Gaps & Questions
   - Flujo en 2 pasos:
     - Paso 1: Client + Vendor research en paralelo
     - Paso 2: Fit & Strategy usando resultados del paso 1

3. **Todas las Secciones con LLM**
   - ✅ Account Snapshot (LLM)
   - ✅ Market Context (LLM)
   - ✅ Strategic Priorities (LLM)
   - ✅ Stakeholder Map (LLM) - **NUEVO**
   - ✅ Competitive Landscape (LLM) - **NUEVO**
   - ✅ Vendor Fit & Plays (LLM) - **NUEVO**
   - ✅ Evidence Pack (LLM)
   - ✅ Gaps & Questions (LLM) - **NUEVO**

### Decisiones Técnicas

1. **Flujo Secuencial**: FitAndStrategyAgent se ejecuta después de Client+Vendor research porque necesita sus resultados como input
2. **Prompts Estructurados**: Cada sección tiene prompts específicos que generan JSON válido
3. **Contexto Rico**: FitAndStrategyAgent recibe toda la información disponible para generar análisis estratégico completo
4. **Eliminación de Datos Fake**: Ya no se usan datos fake cuando hay LLM disponible

### Cómo Probar

1. Configurar API key (si no está configurada):
   ```powershell
   cd CLIINT2/backend
   .\setup-env.ps1
   ```

2. Generar un dashboard desde el frontend

3. Verificar en logs:
   - `[DashboardService] Step 1: Running Client & Vendor research...`
   - `[DashboardService] Step 2: Generating Fit & Strategy analysis...`
   - `[FitAndStrategyAgent] Generando análisis estratégico...`
   - `[FitAndStrategyAgent] ✓ Análisis estratégico completado`

4. Verificar en el dashboard:
   - Todas las secciones tienen datos reales y específicos
   - Stakeholders tienen nombres y roles realistas
   - Competidores son reales del sector
   - Plays son estratégicos y accionables
   - Preguntas son inteligentes y contextualizadas


### Notas

- **100% LLM**: Cuando hay API key, TODO el dashboard se genera con LLM (0% fake)
- **Tiempo de Generación**: ~60-90 segundos (vs instantáneo con fake)
- **Calidad**: Datos reales, específicos y estratégicos basados en conocimiento público
- **Fallback**: Si LLM falla, se usa fake automáticamente (no rompe el flujo)

---

## Fase 5 - Hardening y Refinamientos ✅

### Implementado

1. **Sistema de Errores Mejorado**
   - `src/domain/errors/AppError.ts` - Clases de error personalizadas:
     - `AppError` - Error base con código de estado HTTP
     - `ValidationError` - Errores de validación (400)
     - `NotFoundError` - Recurso no encontrado (404)
     - `LLMError` - Errores relacionados con LLM (500)
   - Manejo de errores específico por tipo en rutas
   - Mensajes de error descriptivos y contextualizados

2. **Validación con Zod**
   - `src/domain/validators/dashboardValidators.ts` - Schema de validación para `CreateDashboardInput`
   - Validación automática en endpoint POST `/api/vendors/:vendorId/dashboard`
   - Mensajes de error detallados con campos específicos

3. **Cache de Resultados LLM**
   - `src/domain/services/llmCache.ts` - Sistema de caché en memoria
   - Cache key basado en vendorId + clientId + serviceId + hash del contexto
   - TTL de 24 horas por defecto
   - Métodos: `get()`, `set()`, `clearExpired()`, `clearAll()`, `getStats()`
   - Integrado en `DashboardService.generateDashboard()` para evitar regeneraciones innecesarias
   - Endpoint `/api/cache/stats` para estadísticas
   - Endpoint `DELETE /api/cache` para limpiar caché

4. **Manejo de Errores en Frontend**
   - Mejora en `lib/api.ts` para parsear errores estructurados del backend
   - Mensajes de error contextualizados según código de error:
     - `VALIDATION_ERROR` - Muestra errores de validación específicos
     - `NOT_FOUND` - Mensaje claro de recurso no encontrado
     - `LLM_ERROR` - Mensaje específico para errores de IA
   - Mejora en `app/clients/new/page.tsx` para mostrar errores más descriptivos

5. **Manejo de Errores Global en Backend**
   - Middleware de error mejorado en `server.ts`
   - Soporte para `AppError` con códigos de estado HTTP
   - Mensajes de error detallados en desarrollo, genéricos en producción

### Decisiones Técnicas

1. **Sistema de Errores**: Uso de clases de error personalizadas permite manejo consistente y tipado fuerte
2. **Validación**: Zod proporciona validación en tiempo de ejecución con mensajes descriptivos
3. **Cache**: Cache en memoria simple pero efectivo para MVP. En producción se podría usar Redis
4. **TTL de Cache**: 24 horas es razonable para dashboards que no cambian frecuentemente
5. **Mensajes de Error**: Balance entre información útil en desarrollo y seguridad en producción

### Cómo Probar

1. **Validación de Errores**:
   ```bash
   # Intentar crear dashboard sin campos requeridos
   curl -X POST http://localhost:3001/api/vendors/vendor123/dashboard \
     -H "Content-Type: application/json" \
     -d '{"clientId": ""}'
   # Debe retornar error 400 con detalles de validación
   ```

2. **Cache**:
   ```bash
   # Crear dashboard (primera vez - sin cache)
   # Crear mismo dashboard (segunda vez - con cache)
   # Verificar en logs: "[DashboardService] Using cached LLM results"
   
   # Ver estadísticas de cache
   curl http://localhost:3001/api/cache/stats
   
   # Limpiar cache
   curl -X DELETE http://localhost:3001/api/cache
   ```

3. **Manejo de Errores**:
   - Intentar acceder a dashboard inexistente: `/api/dashboard/invalid-id`
   - Debe retornar 404 con mensaje claro


### Notas

- **Cache Hit**: Cuando se usa cache, el dashboard se genera instantáneamente (vs 60-90 segundos con LLM)
- **Errores Descriptivos**: Los usuarios ahora reciben mensajes claros sobre qué salió mal
- **Validación Robusta**: Los datos se validan antes de procesar, evitando errores en runtime
- **Fallback Automático**: Si LLM falla, se usa fake data automáticamente (no rompe el flujo)

## Fase 6 - Pivot a oportunidades (WIP)

### Subfase F1.1 – Backend: modelo y endpoints Opportunity ✅

1. **Dominio**
   - `src/domain/models/opportunity.ts` define `OpportunityStage`, `Opportunity` y `CreateOpportunityInput`.
   - `src/domain/services/opportunityService.ts` mantiene un repositorio en memoria con creación/listado y logging centralizado (`pino`).
   - `src/domain/validators/opportunityValidators.ts` valida payloads con Zod (name, stage, deadlines ISO, currency ISO-4217, etc.).

2. **Infraestructura**
   - Nuevo logger central en `src/lib/logger.ts` con `pino` + `pino-pretty` (timestamps ISO y levels configurables).
   - `backend/package.json` incorpora `pino` y `pino-pretty`.
   - `src/http/server.ts` usa el logger para arranque y manejo global de errores.

3. **HTTP API**
   - `src/http/routes/opportunities.ts` añade:
     - `POST /api/vendors/:vendorId/opportunities`
     - `GET /api/vendors/:vendorId/opportunities`
     - `GET /api/opportunities/:opportunityId`
   - Validaciones:
     - El vendor debe existir.
     - `clientId` y `serviceOfferingId` deben pertenecer al vendor.
     - Payload validado con Zod y errores tratados vía `AppError`.

### Cómo probar la subfase

```bash
# 1) Crear vendor, client y service (reutiliza endpoints existentes)
curl -X POST http://localhost:3001/api/vendors \
  -H "Content-Type: application/json" \
  -d '{"name":"Vendor Test","websiteUrl":"https://vendor.test","description":"Demo"}'

curl -X POST http://localhost:3001/api/vendors/VENDOR_ID/clients \
  -H "Content-Type: application/json" \
  -d '{"vendorId":"VENDOR_ID","name":"Cliente Demo","websiteUrl":"https://cliente.test"}'

curl -X POST http://localhost:3001/api/vendors/VENDOR_ID/services \
  -H "Content-Type: application/json" \
  -d '{"vendorId":"VENDOR_ID","name":"Servicio Demo","shortDescription":"Desc","categoryTags":["demo"]}'

# 2) Crear oportunidad
curl -X POST http://localhost:3001/api/vendors/VENDOR_ID/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "CLIENT_ID",
    "serviceOfferingId": "SERVICE_ID",
    "name": "Oportunidad Piloto",
    "stage": "early",
    "estimatedValue": 150000,
    "currency": "eur",
    "deadline": "2025-01-31T00:00:00.000Z",
    "notes": "Contexto inicial"
  }'

# 3) Listar oportunidades del vendor
curl http://localhost:3001/api/vendors/VENDOR_ID/opportunities

# 4) Consultar una oportunidad concreta
curl http://localhost:3001/api/opportunities/OPPORTUNITY_ID
```

> Logs: `logger` imprime (con timestamp) la creación de oportunidades y cualquier error validado.

### Subfase F1.2 – Backend: dashboard ligado a Opportunity ✅

1. **Modelo y tipos**
   - `src/domain/models/clientIntelDashboard.ts` introduce `opportunityId`, `opportunityName?` y `opportunityStage?`.
   - `CreateDashboardInput` ahora requiere `opportunityId`; se añade `CreateOpportunityDashboardInput`.
   - `frontend/lib/types.ts` refleja estos campos y define `OpportunityStage`.

2. **Servicios**
   - `DashboardService.generateDashboardForOpportunity()` usa `OpportunityService` para resolver cliente y servicio, además de construir el contexto (override opcional).
   - `resolveOpportunityContext()` garantiza mínimo de texto; todos los pasos usan `logger`.

3. **HTTP API**
   - Nuevo endpoint `POST /api/vendors/:vendorId/opportunities/:opportunityId/dashboard` (con SSE opcional).
   - Endpoint legacy `/api/vendors/:vendorId/dashboard` devuelve `410 LEGACY_ENDPOINT`.
   - `GET /api/dashboards` expone `opportunityId`, `opportunityStage` y `opportunityName`.

4. **Frontend API (pre-F1.3)**
   - `frontend/lib/api.ts` añade los helpers `createOpportunityDashboard*`.

### Cómo probar la subfase

```bash
# Backend en marcha + Opportunity creada (ver F1.1)
curl -X POST \
  http://localhost:3001/api/vendors/VENDOR_ID/opportunities/OPPORTUNITY_ID/dashboard \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityContextOverride": "Notas adicionales (opcional)",
    "uploadedDocIds": []
  }'

# Streaming con SSE
curl -N -H "Accept: text/event-stream" \
  -X POST \
  http://localhost:3001/api/vendors/VENDOR_ID/opportunities/OPPORTUNITY_ID/dashboard?stream=true \
  -H "Content-Type: application/json" \
  -d '{}'

# Consultar dashboard resultante
curl http://localhost:3001/api/dashboard/DASHBOARD_ID
```

> La terminal del backend mostrará cada fase (cache, LLM, news) con metadata de la oportunidad.

### Subfase F1.3 – Frontend: flujo opportunity-first ✅

1. **Páginas Next.js**
   - `app/opportunities/new/page.tsx`: formulario para vendor + cliente + servicio + metadatos de oportunidad; crea la entidad y redirige al detalle.
   - `app/opportunities/[id]/page.tsx`: vista con metadatos, notas, botón “Generar Strategy Dashboard” (SSE) y placeholder de dossier.
   - `app/opportunities/page.tsx`: listado de oportunidades filtrado por vendorId (se guarda en `localStorage`).
   - `app/page.tsx`: CTA principal orientada a crear/ver oportunidades.

2. **API Frontend**
   - `lib/types.ts` añade `Opportunity` / `CreateOpportunityInput` y actualiza `ClientIntelDashboard`.
   - `lib/api.ts` expone `createOpportunity`, `getOpportunity`, `getOpportunities` y los helpers SSE para oportunidades.

3. **UX**
   - Formularios con shadcn/ui, cero CSS inline, validación básica y mensajes claros.
   - `AnalysisProgress` se reutiliza para el progreso LLM (texto actualizado a GPT-5.1).
   - Listado muestra stage, cliente y notas; botón directo al detalle.

### Cómo probar la subfase

```bash
# Backend y frontend levantados (npm run dev en cada carpeta)

# 1) Crear una oportunidad
#    - http://localhost:3000 → "Crear oportunidad"
#    - Completa vendor/client/service + datos de la oportunidad
#    - Tras guardar, la app redirige a /opportunities/[id]

# 2) Generar Strategy Dashboard
#    - En la vista de la oportunidad, pulsa "Generar Strategy Dashboard"
#    - Observa la tarjeta de progreso (SSE) y espera la redirección a /dashboard/[dashboardId]

# 3) Listado
#    - http://localhost:3000/opportunities
#    - Introduce el vendorId (auto guardado tras la creación) y pulsa "Cargar oportunidades"
#    - Verifica que la nueva oportunidad aparece en la lista
```

> Como el backend está en memoria, recuerda copiar el `vendorId` que devuelve el backend para poder listar sus oportunidades en la UI.



### Subfase F2.1 – Backend: OpportunityDossier básico ✅

1. **Dominio**
   - `src/domain/models/opportunityDossier.ts` define `DossierSourceType`, `DossierTextChunk`, `OpportunityDossier` y `CreateDossierTextChunkInput`.

2. **Servicio**
   - `src/domain/services/opportunityDossierService.ts` mantiene un repositorio en memoria por `opportunityId`.
   - Métodos principales:
     - `getDossier`/`listTextChunks` devuelven y crean el dossier si no existía.
     - `appendTextChunk` valida contenido no vacío, genera IDs únicos y actualiza `updatedAt`.
     - `attachFileId` almacena `file_id` de OpenAI evitando duplicados.
   - Usa `OpportunityService` para asegurar que la oportunidad existe y deja trazas con `logger`.

3. **Script de verificación**
   - `scripts/demoOpportunityDossier.ts` crea vendor/client/service/opportunity y demuestra cómo añadir notas y asociar `file_id`.

### Cómo probar la subfase

```bash
cd backend
npx tsx scripts/demoOpportunityDossier.ts
# Debe imprimir el dossier con sus textChunks y openAiFileIds
```

> Los endpoints HTTP llegarán en F2.2; por ahora el script actúa como prueba unitaria del servicio en memoria.
### Subfase F2.2 – Backend: endpoints para dossier ✅

1. **HTTP API**
   - `POST /api/opportunities/:opportunityId/dossier/text`
   - `GET /api/opportunities/:opportunityId/dossier`
   - `POST /api/opportunities/:opportunityId/dossier/files`
   - Nueva ruta `src/http/routes/opportunityDossier.ts` (usa `multer` en memoria) montada en `server.ts`.

2. **Validación**
   - `src/domain/validators/opportunityDossierValidators.ts` valida `sourceType`, `title?` y `content`.
   - Uploads aceptan un campo `file`; mientras llega File Inputs real generamos un `file_local_*` y lo adjuntamos al dossier.

3. **Servicios reutilizados**
   - `OpportunityDossierService` recibe las operaciones; las rutas verifican la oportunidad y registran eventos con `logger`.

### Cómo probar la subfase

```bash
# Backend en marcha (npm run dev) y oportunidad creada.

# 1) Añadir chunk textual
curl -X POST \
  http://localhost:3001/api/opportunities/OPPORTUNITY_ID/dossier/text \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "email",
    "title": "Correo kickoff",
    "content": "El cliente confirma kickoff el lunes y pide enviar agenda antes del viernes."
  }'

# 2) Listar dossier
curl http://localhost:3001/api/opportunities/OPPORTUNITY_ID/dossier

# 3) Adjuntar archivo (se sube a OpenAI File Search)
curl -X POST \
  -F "file=@/ruta/a/archivo.pdf" \
  http://localhost:3001/api/opportunities/OPPORTUNITY_ID/dossier/files
```

> La respuesta devuelve `fileId` real de OpenAI y el `vectorStoreId` asociado a la oportunidad.

### Subfase F3.1 – Cliente OpenAiDeepResearchClient ✅

1. **Cliente dedicado**
   - `src/llm/deepResearchClient.ts` encapsula la llamada a Responses API (modelo configurable vía `DEEP_RESEARCH_MODEL`, por defecto `o3-deep-research-2025-06-26`).
   - Usa `response_format: { type: 'json_schema' }` con el schema de `ClientDeepResearchReport` para garantizar estructura.

2. **Modelos y configuración**
   - `src/domain/models/clientDeepResearchReport.ts` define input/report (summary, businessModel, marketSegments, riesgos, competidores, fuentes, etc.).
   - `llmConfig` añade `deepResearchModel`.

3. **Integración inicial**
   - `deepResearchService.runClientResearchStructured()` delega en el nuevo cliente.
   - Script `scripts/runDeepResearch.ts` + comando `npm run deeptest` permiten probarlo rápidamente.

### Cómo probar la subfase

```bash
cd backend
# PowerShell
$env:OPENAI_API_KEY="tu_api_key"
# Opcional:
$env:DEEP_RESEARCH_MODEL="o4-mini-deep-research-2025-06-26"
npm run deeptest
# Debe imprimir ClientDeepResearchReport (summary, competitors, sources, etc.)
```

> Requiere Responses API habilitada y la versión reciente del SDK `openai`. Si OpenAI cambia la sintaxis, revisa https://platform.openai.com/docs/api-reference/responses/create.

### Subfase F3.2 – Integración Deep Research → agentes y dashboard ✅

1. **Servicio centralizado**
   - `src/llm/deepResearchService.ts` ahora ofrece `getClientReport(client, service)` que delega en `runClientDeepResearch`, incluye `web_search_preview` y logging con `pino`.
   - El servicio mantiene los métodos legacy (`researchCompetitors`, `researchNews`) pero con logging consistente y control centralizado de la API key.

2. **ClientResearchAgent simplificado**
   - `src/llm/clientResearchAgent.ts` recibe `client`, `service`, `opportunityContext` y el `ClientDeepResearchReport`.
   - El agente se limita a sintetizar el JSON proporcionado (sin relanzar investigación), produce Account Snapshot / Market Context / Strategic Priorities y registra los eventos con el logger central.

3. **DashboardService**
   - `generateLLMSections` ejecuta la investigación profunda como paso obligatorio antes de los agentes.
   - El progreso (`deep-research`) se actualiza en cuanto finaliza el reporte y se pasa al agente de cliente junto al `service`.

4. **Código auxiliar**
   - `ClientDeepResearchReport` se importa en `dashboardService` para tipar internamente el payload.
   - Todo el logging de esta ruta utiliza `logger` (sin `console.log`).

### Cómo probar la subfase

```bash
# 1) Configura API key válida
cd backend
$env:OPENAI_API_KEY="sk-..."
npm run deeptest   # Verifica que el reporte estructurado se genera sin errores (usa web_search_preview)

# 2) End-to-end dashboard ligado a oportunidad
npm run dev  # backend
# (en otra terminal) npm run dev  # frontend
# En la UI:
#   - Crea vendor/client/service + oportunidad
#   - Desde /opportunities/[id], pulsa "Generar Strategy Dashboard"
# En la terminal del backend verás:
#   [DashboardService] ... Deep research step 1 ...
#   [ClientResearchAgent] ... completed synthesis ...
```

Alternativa vía API:

```bash
curl -X POST http://localhost:3001/api/vendors/VENDOR_ID/opportunities/OPPORTUNITY_ID/dashboard \
  -H "Content-Type: application/json" \
  -d '{}'
```

> La respuesta incluye `llmModelUsed` y todas las secciones generadas a partir del reporte profundo.

### Deep Research – observabilidad y comparación de modelos

1. **Toggles y tiempo de espera**
   - `DEEP_RESEARCH_DEBUG=1` → habilita logging a nivel `debug` + heartbeats cada 30 s.
   - `DEEP_RESEARCH_TIMEOUT_MS=600000` (por defecto) → aborta la llamada si supera los 10 min.
   - Ambos flags se leen en `llmConfig` y se pueden ajustar sin tocar código.

2. **Script CLI (`npm run deeptest`)**
   - Ahora acepta argumentos:
     - `--model=o3-deep-research-2025-06-26` (se pueden pasar varios separados por coma para comparar en serie).
     - `--reasoning=low|medium|high`, `--timeoutMs=360000`, `--quiet=1`, etc.
   - Ejemplo para comparar o3 vs o4-mini y ver duraciones:

```bash
# Backend
cd backend
$env:OPENAI_API_KEY="sk-..."

# Ejecuta ambos modelos en serie
npm run deeptest -- --model=o3-deep-research-2025-06-26,o4-mini-deep-research-2025-06-26

# Con logs detallados y timeout personalizado
$env:DEEP_RESEARCH_DEBUG="1"
$env:DEEP_RESEARCH_TIMEOUT_MS="600000"
npm run deeptest -- --model=o3-deep-research-2025-06-26 --reasoning=high --timeoutMs=600000
```

   - Cada ejecución muestra el tiempo total (`✓ ... completado en Xs`) para facilitar la comparación.

3. **Interpretación**
   - `o3-deep-research` puede tardar varios minutos: revisa los heartbeats (“Deep research still running”) para confirmar que la llamada sigue viva.
   - `o4-mini-deep-research` es más rápido pero con menor cobertura; con el prompt reducido (“Dime lo que sepas de <cliente>”) y `reasoning.effort = low` por defecto la latencia suele bajar, aunque seguimos permitiendo hasta 10 min antes de cortar.
   - Si se alcanza el timeout, el log marcará `timedOut: true` y el error indicará cuántos segundos se esperó.

### Subfase F4.1 – JSON Schemas del dashboard ✅

1. **Esquemas por sección**
   - Directorio `backend/src/llm/schemas/` con un fichero por sección: `accountSnapshot`, `opportunitySummary`, `marketContext`, `opportunityRequirements`, `stakeholderMap`, `competitiveLandscape`, `vendorFitAndPlays`, `evidencePack`, `gapsAndQuestions`, `newsOfInterest`, `criticalDates`.
   - Cada schema sigue Draft-07, define `required`, enums y límites (`minimum`/`maximum` en scores y relevancias).

2. **Helper unificado**
   - `backend/src/llm/schemas/index.ts` exporta `dashboardSchemas` y `loadDashboardSchema(name)` para que los agentes GPT-5.1 puedan declarar `response_format` sin duplicar JSON.
   - Gracias a `resolveJsonModule`, los schemas se importan como objetos TS sin configuración extra.

3. **Uso previsto**
   - F4.2+ (agentes con GPT-5.1) sólo tendrán que hacer `loadDashboardSchema('accountSnapshot')` o componer schemas agregados.

### Cómo probar

```bash
# Listar schemas disponibles
ls backend/src/llm/schemas

# (Opcional) validar alguno con ajv
npx ajv validate -s backend/src/llm/schemas/accountSnapshot.json -d sample.json
```

> En esta fase no se conectó aún a los agentes; el helper queda listo para usarse en F4.2/F4.3/F4.4.

### Subfase F4.2 – ClientResearchAgent con GPT-5.1 ✅

1. **Nuevo flujo LLM**
   - `src/llm/clientResearchAgent.ts` ahora usa la Responses API (`gpt-5.1` por defecto) con `response_format = json_schema`.
   - La respuesta estructurada incluye: `accountSnapshot`, `marketContext`, `opportunityRequirements` (antiguas strategic priorities).  
   - Los schemas se cargan desde `loadDashboardSchema(...)`, así que cualquier cambio en los `.json` se refleja automáticamente.
   - **Novedad:** si el dossier de la oportunidad tiene notas (`/dossier/text`), se genera un resumen y se incluye en el prompt (`Notas del dossier: …`). Si no hay notas, se indica explícitamente que no existen.

2. **Configuración**
   - Variables nuevas:
     - `CLIENT_RESEARCH_MODEL` (default: `gpt-5.1`).
     - `CLIENT_RESEARCH_REASONING` (`low|medium|high`, default `medium`).
   - `llmConfig` ya no trae una API key por defecto (vacío → hay que exportar `OPENAI_API_KEY` sí o sí).

3. **DashboardService**
   - `generateLLMSections` consume el output del agente y llena `opportunityRequirements` reales (ya no usa `generateFakeOpportunityRequirements` cuando hay LLM).
   - El resto de secciones siguen igual (VendorResearch y Fit&Strategy se mantienen en GPT-4o por ahora).

4. **Validación**
   - `npm run type-check` ✅
   - Flujo recomendado:

```bash
cd backend
$env:OPENAI_API_KEY="sk-..."
$env:CLIENT_RESEARCH_MODEL="gpt-5.1"              # opcional
$env:CLIENT_RESEARCH_REASONING="medium"           # opcional
npm run dev
# Desde el frontend o vía curl generar un dashboard → verificar en logs:
#   [ClientResearchAgent] ... completed synthesis
# y que la sección Opportunity Requirements ya no sea fake.

# Para probar el dossier:
curl -X POST http://localhost:3001/api/opportunities/OPP_ID/dossier/text \
  -H "Content-Type: application/json" \
  -d '{"sourceType":"email","title":"Kickoff","content":"Cliente pide agenda el lunes."}'
# Después genera el dashboard → en los logs se verá "Notas del dossier" y el agente las usará como contexto.
```

> El script `npm run deeptest` sigue siendo el punto de entrada para comparar modelos deep-research; ahora se complementa con el nuevo agente estructurado cuando se genera un dashboard completo.

### File Search del dossier ✅

1. **Almacenamiento en OpenAI**
   - Cada oportunidad dispone de un vector store dedicado (`dossier_{opportunityId}`). La primera vez que subes un archivo via `POST /dossier/files`, se crea automáticamente y se guarda su `vectorStoreId` en `OpportunityDossier`.
   - Los PDFs / docs se suben con la API de Files (`purpose: assistants`) y se asocian al vector store mediante `vectorStores.files.create`.

2. **Agentes que lo consumen**
   - `ClientResearchAgent` declara `file_search` cuando existe `vectorStoreId`, de modo que GPT‑5.1 puede leer el dossier además de las notas resumidas.
   - `FitAndStrategyAgent` también incorpora `file_search + web_search`, así Stakeholder/Competitive/Vendor Fit tienen acceso directo al dossier.

3. **Cómo probar**

```bash
# Subir un PDF al dossier
curl -X POST \
  -F "file=@brief.pdf" \
  http://localhost:3001/api/opportunities/OPP_ID/dossier/files

# Generar dashboard y revisar logs:
#   [ClientResearchAgent] ... file_search tool active ...
#   [FitAndStrategyAgent] ... file_search tool active ...
```

> Si necesitas limpiar estados, recuerda que por ahora todo está en memoria, pero los vector stores quedan en tu cuenta de OpenAI (puedes listarlos desde la consola si quieres eliminarlos).

### Fase 5.2 – Proposal Outline ✅

1. **Agente dedicado**
   - `src/llm/proposalOutlineAgent.ts` usa GPT-5.1 + `web_search` + `file_search` (si hay dossier) y Structured Output (`proposalOutline` schema).
   - Input: cliente, servicio, contexto, requisitos, evidencias y resumen del dossier.
   - Salida: máx. 4 secciones con propósito, bullets y evidencias enlazadas.

2. **Integración backend**
   - `dashboardService.generateLLMSections` añade el outline al objeto `sections` y lo replica en `ClientIntelDashboard.proposalOutline`.
   - El fake generator deja el campo vacío.

3. **UI**
   - Nueva card `ProposalOutlineCard` en `/dashboard/[id]` mostrando título, propósito, bullets y evidencias.

### Cómo probar

```bash
# Generar un dashboard con dossier + evidencias
npm run dev  # en backend y frontend
# Dashboard ahora muestra la card "Proposal Outline" con las secciones propuestas.
```

### Fase 5.1 – Priorización y límites ✅

1. **Backend**
   - Tipos con nuevos campos:
     - `priorityLevel` en Opportunity Requirements y Gaps.
     - `isCritical` en Smart Questions.
   - Post-procesado tras los agentes: recorta stakeholders (≤8), competidores (≤4), gaps (≤5), preguntas (≤6), requisitos (≤4) y aplica defaults (`high→must`, `low→nice`, etc.).

2. **Prompts**
   - `ClientResearchAgent` y `FitAndStrategyAgent` incluyen instrucciones de cardinalidad y de marcado de criticidad.

3. **Frontend**
   - Badges “MUST/SHOULD/NICE” en requisitos y prioridades de gaps.
   - Preguntas críticas resaltadas.
