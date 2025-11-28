# ClientIntel – Documentación de APIs, Funciones y Componentes

Esta guía recoge **todos los contratos públicos** disponibles en el proyecto, tanto en el backend Express como en el frontend Next.js. Incluye los modelos de datos, servicios reutilizables, componentes React y ejemplos prácticos (cURL y TypeScript) para acelerar la implementación.

---

## 1. Contexto y convenciones

- **Repositorio**: monorepo con `backend/` (Express + TypeScript) y `frontend/` (Next.js 13, App Router).
- **Almacenamiento**: actualmente todo el dominio persiste en memoria (`Map`) para prototipado rápido.
- **Formato**: todas las respuestas HTTP son JSON. Los errores usan `{ error, code, details?, message? }`.
- **Idiomas**: la UI está en español, pero los modelos usan cadenas en inglés para variables y enums.
- **Autenticación**: no hay autenticación; se recomienda proteger los endpoints antes de exponerlos en producción.

---

## 2. Configuración de entorno

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `PORT` | Puerto del backend Express | `3001` |
| `CORS_ORIGIN` | Origen permitido para la SPA | `http://localhost:3000` |
| `OPENAI_API_KEY` | Clave para habilitar agentes GPT-4o | _vacío_ |
| `LLM_MODEL` | Modelo LLM preferido | `gpt-4o` |
| `LLM_TEMPERATURE` | Temperatura numérica | `0.4` (backend) / `0.3` (LLM config) |
| `NEXT_PUBLIC_API_URL` | Base URL que usa el SDK frontend | `http://localhost:3001/api` |

> Si `OPENAI_API_KEY` no está definido, el backend genera dashboards con datos sintéticos y lo indica en logs.

---

## 3. API HTTP (backend `backend/src/http/routes/*`)

### 3.1 Salud

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Devuelve el estado del servicio y marca temporal. |

```bash
curl http://localhost:3001/api/health
```

Respuesta `200`:

```json
{ "status": "ok", "timestamp": "2025-11-26T12:00:00.000Z", "service": "clientintel-backend" }
```

### 3.2 Vendors

| Método | Ruta | Request body | Notas |
| --- | --- | --- | --- |
| `POST` | `/api/vendors` | `{ name, websiteUrl, description? }` | Valida campos obligatorios. Responde `201` con el objeto `Vendor`. |
| `GET` | `/api/vendors/:vendorId` | — | `404` si no existe. |

Ejemplo creación:

```bash
curl -X POST http://localhost:3001/api/vendors \
  -H "Content-Type: application/json" \
  -d '{ "name":"Indra", "websiteUrl":"https://indra.es" }'
```

### 3.3 Clients

El router se monta en dos rutas:

- `/api/vendors/:vendorId/clients`
- `/api/clients`

| Método | Ruta efectiva | Parámetros | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/vendors/:vendorId/clients` | Body `CreateClientAccountInput` | Crea cliente. Si el router se usa fuera de contexto de vendor, pasa `vendorId` en el body. |
| `GET` | `/api/vendors/:vendorId/clients` | Param/Query `vendorId` | Lista clientes del vendor. |
| `GET` | `/api/clients` | Query opcional `vendorId` | Lista global con filtro opcional. |
| `GET` | `/api/clients/:clientId` | Path param | Busca por id. |

Validación mínima: `vendorId`, `name`, `websiteUrl`. Devuelve `400` si faltan.

### 3.4 Servicios (Service Offerings)

Router compartido en `/api/vendors/:vendorId/services` y `/api/services`.

| Método | Ruta | Request | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/vendors/:vendorId/services` | `CreateServiceOfferingInput` | Crea servicio del vendor. |
| `GET` | `/api/vendors/:vendorId/services` | — | Lista por vendor. |
| `GET` | `/api/services` | Query `vendorId?` | Lista global. |
| `GET` | `/api/services/:serviceId` | — | Recupera uno. |

### 3.5 Dashboards

| Método | Ruta | Detalles |
| --- | --- | --- |
| `POST` | `/api/vendors/:vendorId/dashboard` | Genera un dashboard completo. Si `Accept: text/event-stream` o `?stream=true`, el servicio emite eventos SSE con progreso (`ProgressEvent`) y termina con un objeto `{ type: "complete", dashboardId, dashboard }`. Sin streaming devuelve `201` con `{ dashboardId, dashboard }`. |
| `GET` | `/api/dashboards` | Lista resúmenes. Query opcional `vendorId`. |
| `GET` | `/api/dashboard/:dashboardId` | Devuelve el dashboard íntegro. |

Payload `CreateDashboardInput`:

```json
{
  "clientId": "client_123",
  "serviceOfferingId": "service_456",
  "vendorId": "vendor_abc",
  "opportunityContext": "Texto ≥ 10 caracteres",
  "uploadedDocIds": ["optional"]
}
```

Ejemplo SSE (se recomienda `curl` 7.88+):

```bash
curl -N -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -X POST "http://localhost:3001/api/vendors/vendor_abc/dashboard?stream=true" \
  -d '{ "...": "..." }'
```

Eventos posibles:

- `{"stepId":"client-analysis","status":"in-progress","message":"..."}`.
- `{"type":"complete","dashboardId":"dashboard_123","dashboard":{...}}`.

### 3.6 Cache de LLM

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/cache/stats` | Devuelve `{ size, entries }`. |
| `DELETE` | `/api/cache` | Limpia el cache y reporta cuántas entradas expiradas se eliminaron. |

---

## 4. Servicios de dominio y agentes (backend `backend/src/domain` y `backend/src/llm`)

| Servicio | Métodos clave | Notas |
| --- | --- | --- |
| `ClientService` | `create(input)`, `getById(id)`, `getByVendorId(vendorId)`, `getAll()` | Usa `Map` en memoria. IDs `client_<timestamp>`. |
| `VendorService` | `create`, `getById`, `getAll()` | Similar a clients. |
| `ServiceOfferingService` | `create`, `getById`, `getByVendorId`, `getAll` | Maneja `categoryTags`. |
| `DashboardService` | `generateDashboard(input, onProgress?)`, `generateFakeDashboard`, `getById`, `getAll`, `getByVendorId` | Orquesta vendors/clients/services y los agentes LLM; aplica cache; emite SSE. |
| `LLMCache` | `get`, `set`, `clearAll`, `clearExpired`, `getStats` | TTL 24h; clave = `vendor:client:service:hash(context)`. |
| `LLMClient` | `generate`, `generateJSON` | Envoltorio de `openai` con limpieza de bloque ```json```. |
| `ClientResearchAgent` | `research(client, opportunityContext)` | Genera `accountSnapshot`, `marketContext`, `strategicPriorities`. |
| `VendorResearchAgent` | `research(vendor, service)` | Devuelve `VendorResearchOutput` con evidencias. |
| `FitAndStrategyAgent` | `generate(vendor, client, service, opportunityContext, clientResearch, vendorEvidence)` | Produce `stakeholderMap`, `competitiveLandscape`, `vendorFitAndPlays`, `gapsAndQuestions`. |
| `deepResearchService` | `researchCompany`, `researchCompetitors`, `researchNews` | Usa GPT-4o con búsqueda. Necesita API key válida. |

Ejemplo de uso interno (simplificado):

```ts
const dashboard = await DashboardService.generateDashboard(input, (event) => {
  console.log('Paso:', event.stepId, event.status)
})
```

Errores relevantes (`backend/src/domain/errors/AppError.ts`):

- `ValidationError` → `400`, `code: VALIDATION_ERROR`
- `NotFoundError` → `404`, `code: NOT_FOUND`
- `LLMError` → `500`, `code: LLM_ERROR`

---

## 5. SDK frontend (`frontend/lib/api.ts`)

Todas las funciones usan `fetch` y lanzan `Error` con mensajes amigables en español.

| Función | Firma | Descripción |
| --- | --- | --- |
| `getHealth()` | `() => Promise<{ status; timestamp; service }>` | Pinga `/health`. |
| `createVendor(input)` | `(CreateVendorInput) => Promise<Vendor>` | POST `/vendors`. |
| `getVendor(id)` | `(string) => Promise<Vendor>` | GET `/vendors/:id`. |
| `createService(vendorId, input)` | `(string, CreateServiceOfferingInput) => Promise<ServiceOffering>` | POST `/vendors/:vendorId/services`. |
| `getServices(vendorId)` | `(string) => Promise<ServiceOffering[]>` | GET `/vendors/:vendorId/services`. |
| `getService(serviceId)` | `(string) => Promise<ServiceOffering>` | GET `/services/:id`. |
| `createClient(vendorId, input)` | `(string, CreateClientAccountInput) => Promise<ClientAccount>` | POST `/vendors/:vendorId/clients`. |
| `getClients(vendorId)` | `(string) => Promise<ClientAccount[]>` | GET `/vendors/:vendorId/clients`. |
| `getClient(clientId)` | `(string) => Promise<ClientAccount>` | GET `/clients/:id`. |
| `createDashboard(vendorId, input)` | `(string, CreateDashboardInput) => Promise<{ dashboardId; dashboard }>` | POST estándar sin streaming. |
| `createDashboardWithProgress(vendorId, input, onProgress)` | `(string, CreateDashboardInput, (ProgressEvent) => void) => Promise<{ dashboardId; dashboard }>` | Crea un `fetch` SSE manual, procesa líneas `data:` y resuelve cuando recibe `type: complete`. |
| `getDashboard(dashboardId)` | `(string) => Promise<ClientIntelDashboard>` | GET `/dashboard/:id`. |
| `getAllDashboards(vendorId?)` | `(string?) => Promise<DashboardSummary[]>` | GET `/dashboards`. |

Ejemplo de uso en React:

```ts
import { createDashboardWithProgress } from '@/lib/api'

const { dashboard } = await createDashboardWithProgress(
  vendorId,
  { vendorId, clientId, serviceOfferingId, opportunityContext },
  (event) => setSteps((prev) => prev.map(
    (s) => s.id === event.stepId ? { ...s, status: event.status } : s
  ))
)
```

---

## 6. Componentes React públicos

### 6.1 Componentes de flujo de análisis

| Componente | Props | Uso |
| --- | --- | --- |
| `AnalysisProgress` (`frontend/components/analysis-progress.tsx`) | `{ steps: AnalysisStep[], currentStep: number }` | Visualiza progreso con badges y barra porcentual. Cada `AnalysisStep` = `{ id, label, status, message? }`. |

### 6.2 Componentes de dashboard (`frontend/components/dashboard/*`)

Todos reciben la sección correspondiente del tipo `ClientIntelDashboardSections`. Se enfocan en visualización y no mutan estado.

- `AccountSnapshotCard` `{ data, compact? }`: muestra overview del cliente.
- `OpportunitySummaryCard` `{ data }`: KPIs del cliente y de la oportunidad.
- `MarketContextCard` `{ data }`: tendencias, eventos y métricas de mercado.
- `OpportunityRequirementsCard` `{ data }`: pestañas para requisitos, lo que busca el cliente, scope y exclusiones.
- `StakeholderCard` `{ data }`: tabla de stakeholders con badges para influencia/stance.
- `CompetitiveCard` `{ data }`: pestañas para competidores del cliente, del vendor y alternativas.
- `VendorFitCard` `{ data, compact? }`: puntuación de encaje y plays recomendados.
- `EvidenceCard` `{ data }`: lista de evidencias; incluye botón para copiar snippets.
- `GapsQuestionsCard` `{ data }`: pestañas para gaps y preguntas; soporta copy-to-clipboard.
- `NewsOfInterestCard` `{ data }`: tabla de noticias con enlaces externos.
- `CriticalDatesCard` `{ data }`: tabla ordenada de hitos/deadlines y badge de "próximas".
- `PrioritiesCard` `{ data: StrategicPrioritiesSection }`: muestra prioridades estratégicas y pain points (tipo definido internamente por los agentes LLM; estructura: `{ priorities: [{ id, name, description, relevanceToService, painPoints[] }], summary }`). Aunque aún no se renderiza en el dashboard principal, está lista para usarse.

Ejemplo de composición (ver `frontend/app/dashboard/[id]/page.tsx`):

```tsx
<div className="grid grid-cols-4 gap-3">
  <OpportunitySummaryCard data={dashboard.sections.opportunitySummary} />
  <OpportunityRequirementsCard data={dashboard.sections.opportunityRequirements} />
  <StakeholderCard data={dashboard.sections.stakeholderMap} />
  <VendorFitCard data={dashboard.sections.vendorFitAndPlays} />
</div>
```

### 6.3 Componentes de infraestructura

- `ThemeProvider`: wrapper de `next-themes`. Props iguales a `ThemeProviderProps`.
- `ThemeToggle`: botón que conmuta entre tema claro/oscuro. Usa `next-themes` y `lucide-react`.

### 6.4 Primitivas UI (`frontend/components/ui/*`)

Basadas en shadcn/ui. Todas exponen la misma API que los componentes HTML/Radix originales más props específicos:

| Componente | Props destacados |
| --- | --- |
| `Button` | `variant = "default" | "outline" | "ghost" | "link"`, `size = "default" | "sm" | "lg" | "icon"`. |
| `Badge` | `variant = "default" | "secondary" | "destructive" | "outline"`. |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. |
| `Checkbox` | Envuelve `@radix-ui/react-checkbox`; acepta props estándar. |
| `Dialog` | Exporta `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, etc. |
| `Input`, `Textarea`, `Label` | Extienden los atributos HTML respectivos. |
| `Progress` | Usa `value` (0-100). Exposición SSR-safe gracias a CSS custom property. |
| `Select` | Exporta `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, etc. |
| `Tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. |
| `Table` | `Table`, `TableHeader`, `TableBody`, `TableRow`, etc. |

Todas comparten la utilidad `cn` (`frontend/lib/utils.ts`) para componer clases (`clsx` + `tailwind-merge`).

---

## 7. Modelos de datos clave

| Modelo | Campos principales |
| --- | --- |
| `Vendor` | `id`, `name`, `websiteUrl`, `description?`, `createdAt`, `updatedAt`. |
| `ClientAccount` | `id`, `vendorId`, `name`, `websiteUrl`, `country?`, `sectorHint?`, `notes?`, `createdAt`, `updatedAt`. |
| `ServiceOffering` | `id`, `vendorId`, `name`, `shortDescription`, `categoryTags[]`, timestamps. |
| `ClientIntelDashboard` | `id`, `vendorId`, `clientId`, `serviceOfferingId`, `opportunityContext`, `generatedAt`, `llmModelUsed`, `sections`. |
| `ClientIntelDashboardSections` | `accountSnapshot`, `opportunitySummary`, `marketContext`, `opportunityRequirements`, `stakeholderMap`, `competitiveLandscape`, `vendorFitAndPlays`, `evidencePack`, `gapsAndQuestions`, `newsOfInterest`, `criticalDates`. |
| `ProgressEvent` | `stepId`, `status ("pending"|"in-progress"|"completed"|"error")`, `message?`, `progress?`. |

Para referencias detalladas, revisar `backend/src/domain/models/*.ts` y `frontend/lib/types.ts` (comparten prácticamente la misma estructura).

---

## 8. Flujo completo recomendado

1. **Crear vendor**
   ```ts
   const vendor = await createVendor({ name: 'Indra', websiteUrl: 'https://indra.es' })
   ```
2. **Crear client**
   ```ts
   const client = await createClient(vendor.id, {
     vendorId: vendor.id,
     name: 'Telefónica',
     websiteUrl: 'https://telefonica.com',
     country: 'España',
     sectorHint: 'Telecomunicaciones',
   })
   ```
3. **Crear servicio**
   ```ts
   const service = await createService(vendor.id, {
     vendorId: vendor.id,
     name: 'Plataforma Digital',
     shortDescription: 'Modernización cloud + IA',
     categoryTags: ['cloud', 'automation', 'ai'],
   })
   ```
4. **Generar dashboard con streaming**
   ```ts
   const { dashboardId } = await createDashboardWithProgress(
     vendor.id,
     {
       vendorId: vendor.id,
       clientId: client.id,
       serviceOfferingId: service.id,
       opportunityContext: 'Contexto detallado ...',
     },
     handleProgressEvent
   )
   ```
5. **Consultar resúmenes** (`getAllDashboards()`) o **ver detalle** (`getDashboard(dashboardId)`).

---

## 9. Resolución de problemas

| Síntoma | Posible causa | Acción |
| --- | --- | --- |
| `LLM generation failed, falling back to fake data` en logs | No hay `OPENAI_API_KEY` o error de OpenAI | Configura la clave y revisa cuota. |
| `VendorId, name, and websiteUrl are required` (400) | Campos faltantes al crear clientes/servicios | Asegúrate de mandar `vendorId` en el body incluso si usas la ruta anidada. |
| SSE se corta antes de `type: "complete"` | Cliente cerró la conexión o error en agentes | Reintenta la petición; revisa logs para el `stepId` que falló. |
| `No response body` en `createDashboardWithProgress` | El fetch no expuso `ReadableStream` (SSR) | Solo llámalo en componentes `use client` del navegador. |

---

## 10. Próximos pasos recomendados

- Añadir persistencia real (por ejemplo, Postgres) reemplazando los `Map` en `ClientService`, `VendorService`, etc.
- Implementar autenticación/API keys antes de exponer los endpoints.
- Completar el render del componente `PrioritiesCard` conectándolo a `dashboard.sections.opportunityRequirements` o a los datos reales de `strategicPriorities`.
- Ampliar la documentación con diagramas (ver `docs/ARCHITECTURE.md`) y secuencias de interacción cuando se estabilicen los agentes LLM.

Esta documentación se mantendrá alineada con la base de código. Revisa los archivos citados para detalles adicionales cuando agregues nuevos endpoints o componentes.
