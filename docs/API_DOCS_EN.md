# ClientIntel – Public API, Function & Component Reference

This guide enumerates every public contract exposed by the monorepo: HTTP endpoints, reusable domain services, the frontend SDK (`frontend/lib/api.ts`), shared data models, and React components. Each section contains usage notes plus example requests/snippets so you can integrate or extend the platform with confidence.

---

## 1. Overview & conventions

- **Repo layout**: `backend/` (Express + TypeScript) and `frontend/` (Next.js 13 App Router).
- **Storage**: domain entities live in in-memory `Map`s while the MVP is validated.
- **Payloads**: all HTTP responses are JSON. Errors follow `{ error, code, details?, message? }`.
- **Language**: UI copy is Spanish but data structures/enums stay in English.
- **Auth**: no authentication yet; lock endpoints down before exposing them publicly.

---

## 2. Environment & base URLs

| Variable | Meaning | Default |
| --- | --- | --- |
| `PORT` | Express port | `3001` |
| `CORS_ORIGIN` | Allowed SPA origin | `http://localhost:3000` |
| `OPENAI_API_KEY` | Enables GPT‑4o agents | _empty_ |
| `LLM_MODEL` | Preferred LLM model | `gpt-4o` |
| `LLM_TEMPERATURE` | Numeric temperature | `0.4` (backend) / `0.3` (LLM config) |
| `NEXT_PUBLIC_API_URL` | Base URL consumed by the frontend SDK | `http://localhost:3001/api` |

> When `OPENAI_API_KEY` is missing the backend falls back to deterministic fake data and logs a warning.

---

## 3. HTTP API surface (`backend/src/http/routes/*`)

### 3.1 Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe returning status + timestamp. |

```bash
curl http://localhost:3001/api/health
```

Returns `200`:

```json
{ "status": "ok", "timestamp": "2025-11-26T12:00:00.000Z", "service": "clientintel-backend" }
```

### 3.2 Vendors

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/vendors` | `{ name, websiteUrl, description? }` | Validates required fields, responds `201` with `Vendor`. |
| `GET` | `/api/vendors/:vendorId` | — | `404` when not found. |

### 3.3 Clients

Router is mounted at **both** `/api/vendors/:vendorId/clients` and `/api/clients`. Inside the router `vendorId` can be supplied via path or `vendorId` query/body.

| Method | Route | Params | Description |
| --- | --- | --- | --- |
| `POST` | `/api/vendors/:vendorId/clients` | Body `CreateClientAccountInput` | Creates a client under a vendor. Always include `vendorId` in the payload for safety. |
| `GET` | `/api/vendors/:vendorId/clients` | Path/query `vendorId` | Lists clients for the vendor. |
| `GET` | `/api/clients` | Query `vendorId?` | Lists every client; optional filter. |
| `GET` | `/api/clients/:clientId` | Path param | Fetches a single client. |

Fields `vendorId`, `name`, `websiteUrl` are required; otherwise the API answers `400`.

### 3.4 Service offerings

Mounted at `/api/vendors/:vendorId/services` plus `/api/services`.

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/vendors/:vendorId/services` | `CreateServiceOfferingInput` | Creates an offering linked to a vendor. |
| `GET` | `/api/vendors/:vendorId/services` | — | Lists offerings per vendor. |
| `GET` | `/api/services` | Query `vendorId?` | Global listing with optional filter. |
| `GET` | `/api/services/:serviceId` | — | Fetches a single offering. |

### 3.5 Dashboards

| Method | Path | Details |
| --- | --- | --- |
| `POST` | `/api/vendors/:vendorId/dashboard` | Generates a dashboard. When `Accept: text/event-stream` or `?stream=true` is provided the endpoint streams `ProgressEvent` objects via SSE and finishes with `{ type: "complete", dashboardId, dashboard }`. Otherwise it returns `201` with the same payload synchronously. |
| `GET` | `/api/dashboards` | Lists dashboard summaries, optionally filtered by `vendorId`. |
| `GET` | `/api/dashboard/:dashboardId` | Returns the full `ClientIntelDashboard`. |

Payload `CreateDashboardInput`:

```json
{
  "clientId": "client_123",
  "serviceOfferingId": "service_456",
  "vendorId": "vendor_abc",
  "opportunityContext": "At least 10 characters describing the deal",
  "uploadedDocIds": ["optional"]
}
```

SSE sample (requires a curl build with HTTP/2 disabled):

```bash
curl -N -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -X POST "http://localhost:3001/api/vendors/vendor_abc/dashboard?stream=true" \
  -d '{ "...": "..." }'
```

Possible events:

- `{"stepId":"client-analysis","status":"in-progress","message":"..."}` – emitted throughout the pipeline.
- `{"type":"complete","dashboardId":"dashboard_123","dashboard":{...}}` – final payload.

### 3.6 LLM cache

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/cache/stats` | Returns `{ size, entries }` for observability. |
| `DELETE` | `/api/cache` | Clears the whole cache and reports how many expired entries were removed. |

---

## 4. Domain services & agent layer

| Service | Key methods | Notes |
| --- | --- | --- |
| `ClientService` | `create`, `getById`, `getByVendorId`, `getAll` | In-memory `Map`, ids `client_<timestamp>`. |
| `VendorService` | `create`, `getById`, `getAll` | Same approach for vendors. |
| `ServiceOfferingService` | `create`, `getById`, `getByVendorId`, `getAll` | Persists `categoryTags`. |
| `DashboardService` | `generateDashboard(input, onProgress?)`, `generateFakeDashboard`, `getById`, `getAll`, `getByVendorId` | Coordinates repository lookups, invokes LLM agents, streams progress and caches sections. |
| `LLMCache` | `get`, `set`, `clearAll`, `clearExpired`, `getStats` | TTL = 24h; key composed from vendor/client/service/context hash. |
| `LLMClient` | `generate`, `generateJSON` | Thin OpenAI wrapper that strips ```json fences before parsing. |
| `ClientResearchAgent` | `research(client, opportunityContext)` | Produces `accountSnapshot`, `marketContext`, `strategicPriorities`. |
| `VendorResearchAgent` | `research(vendor, service)` | Outputs offerings, differentiators and `EvidenceItem[]`. |
| `FitAndStrategyAgent` | `generate(vendor, client, service, opportunityContext, clientResearch, vendorEvidence)` | Delivers `stakeholderMap`, `competitiveLandscape`, `vendorFitAndPlays`, `gapsAndQuestions`. |
| `deepResearchService` | `researchCompany`, `researchCompetitors`, `researchNews` | Uses GPT‑4o with native browsing tools; requires a valid API key. |

Typical orchestration inside `DashboardService`:

```ts
const dashboard = await DashboardService.generateDashboard(payload, (event) => {
  console.log('[progress]', event.stepId, event.status)
})
```

Custom errors (`backend/src/domain/errors/AppError.ts`):

- `ValidationError` → HTTP `400`, `code: VALIDATION_ERROR`
- `NotFoundError` → HTTP `404`, `code: NOT_FOUND`
- `LLMError` → HTTP `500`, `code: LLM_ERROR`

---

## 5. Frontend SDK (`frontend/lib/api.ts`)

All helpers call `fetch` with JSON parsing, throw `Error` objects enriched with `code` / `details` when possible, and localise validation failures in Spanish.

| Function | Signature | Description |
| --- | --- | --- |
| `getHealth()` | `() => Promise<{ status; timestamp; service }>` | Hits `/health`. |
| `createVendor(input)` | `(CreateVendorInput) => Promise<Vendor>` | POST `/vendors`. |
| `getVendor(id)` | `(string) => Promise<Vendor>` | GET `/vendors/:id`. |
| `createService(vendorId, input)` | `(string, CreateServiceOfferingInput) => Promise<ServiceOffering>` | POST `/vendors/:vendorId/services`. |
| `getServices(vendorId)` | `(string) => Promise<ServiceOffering[]>` | GET `/vendors/:vendorId/services`. |
| `getService(id)` | `(string) => Promise<ServiceOffering>` | GET `/services/:id`. |
| `createClient(vendorId, input)` | `(string, CreateClientAccountInput) => Promise<ClientAccount>` | POST `/vendors/:vendorId/clients`. |
| `getClients(vendorId)` | `(string) => Promise<ClientAccount[]>` | GET `/vendors/:vendorId/clients`. |
| `getClient(id)` | `(string) => Promise<ClientAccount>` | GET `/clients/:id`. |
| `createDashboard(vendorId, input)` | `(string, CreateDashboardInput) => Promise<CreateDashboardResponse>` | Non-streaming POST. |
| `createDashboardWithProgress(vendorId, input, onProgress)` | `(string, CreateDashboardInput, (ProgressEvent) => void) => Promise<{ dashboardId; dashboard }>` | Opens a manual SSE reader, invoking `onProgress` for each partial event and resolving when a `type: "complete"` payload arrives. |
| `getDashboard(id)` | `(string) => Promise<ClientIntelDashboard>` | GET `/dashboard/:id`. |
| `getAllDashboards(vendorId?)` | `(string?) => Promise<DashboardSummary[]>` | GET `/dashboards` (optionally filtered). |

Usage sample:

```ts
import { createDashboardWithProgress } from '@/lib/api'

const { dashboard } = await createDashboardWithProgress(
  vendorId,
  { vendorId, clientId, serviceOfferingId, opportunityContext },
  (evt) => setSteps((previous) =>
    previous.map((step) =>
      step.id === evt.stepId ? { ...step, status: evt.status, message: evt.message } : step
    )
  )
)
```

---

## 6. React components

### 6.1 Analysis workflow

| Component | Props | Description |
| --- | --- | --- |
| `AnalysisProgress` (`frontend/components/analysis-progress.tsx`) | `{ steps: AnalysisStep[]; currentStep: number }` | Card displaying global progress, per-step badges and optional messages (uses `Progress`, `Badge`). |

`AnalysisStep` structure: `{ id: string; label: string; status: 'pending' | 'in-progress' | 'completed' | 'error'; message?: string }`.

### 6.2 Dashboard building blocks (`frontend/components/dashboard/*`)

Every component receives a slice from `ClientIntelDashboardSections` and only renders data:

- `AccountSnapshotCard` `{ data, compact? }` – company overview, metrics, HQ.
- `OpportunitySummaryCard` `{ data }` – opportunity KPIs with trend icons.
- `MarketContextCard` `{ data }` – market size, growth, industry trends, recent events.
- `OpportunityRequirementsCard` `{ data }` – tabbed view (requirements, what client seeks, scope, exclusions, selection criteria).
- `StakeholderCard` `{ data }` – table of stakeholders, badges for stance/influence, inline notes.
- `CompetitiveCard` `{ data }` – tabs for client competitors, vendor competitors, alternatives.
- `VendorFitCard` `{ data, compact? }` – fit score gauge + dimensions + recommended plays.
- `EvidenceCard` `{ data }` – top evidence items with copy-to-clipboard helpers.
- `GapsQuestionsCard` `{ data }` – gaps table and intelligent questions (with copy button).
- `NewsOfInterestCard` `{ data }` – news table showing source, relevance and impact.
- `CriticalDatesCard` `{ data }` – upcoming deadlines/meetings sorted chronologically.
- `PrioritiesCard` `{ data: StrategicPrioritiesSection }` – renders strategic priorities plus pain points. The `StrategicPrioritiesSection` object (generated by the client research agent) looks like `{ priorities: [{ id, name, description, relevanceToService, painPoints: [{ id, description, severity }] }], summary }`.

See `frontend/app/dashboard/[id]/page.tsx` for a dense four-column layout composing these components.

### 6.3 Infrastructure components

- `ThemeProvider`: thin wrapper around `next-themes` provider; accepts the same props (`attribute`, `defaultTheme`, etc.).
- `ThemeToggle`: client-only button toggling between light/dark with `Sun`/`Moon` icons.

### 6.4 UI primitives (`frontend/components/ui/*`)

Shadcn-style headless wrappers that share the same API as the underlying HTML/Radix components:

| Primitive | Key props |
| --- | --- |
| `Button` | `variant = "default" | "outline" | "ghost" | "link"`, `size = "default" | "sm" | "lg" | "icon"`. |
| `Badge` | `variant = "default" | "secondary" | "destructive" | "outline"`. |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. |
| `Checkbox` | All Radix checkbox props (`checked`, `onCheckedChange`, etc.). |
| `Dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`. |
| `Input`, `Textarea`, `Label` | Extend their respective HTML attribute sets. |
| `Progress` | Accepts `value` (0–100); uses CSS custom property to avoid inline styles. |
| `Select` | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, separators, scroll buttons. |
| `Tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. |
| `Table` | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`, `TableFooter`. |

All components consume the shared `cn` helper (`frontend/lib/utils.ts`) which combines `clsx` + `tailwind-merge`.

---

## 7. Data models (extract)

| Model | Fields |
| --- | --- |
| `Vendor` | `id`, `name`, `websiteUrl`, `description?`, `createdAt`, `updatedAt`. |
| `ClientAccount` | `id`, `vendorId`, `name`, `websiteUrl`, `country?`, `sectorHint?`, `notes?`, timestamps. |
| `ServiceOffering` | `id`, `vendorId`, `name`, `shortDescription`, `categoryTags[]`, timestamps. |
| `ClientIntelDashboard` | `id`, `vendorId`, `clientId`, `serviceOfferingId`, `opportunityContext`, `generatedAt`, `llmModelUsed`, `sections`. |
| `ClientIntelDashboardSections` | `accountSnapshot`, `opportunitySummary`, `marketContext`, `opportunityRequirements`, `stakeholderMap`, `competitiveLandscape`, `vendorFitAndPlays`, `evidencePack`, `gapsAndQuestions`, `newsOfInterest`, `criticalDates`. |
| `ProgressEvent` | `stepId`, `status` (`'pending' | 'in-progress' | 'completed' | 'error'`), `message?`, `progress?`. |

Refer to `backend/src/domain/models/*.ts` and `frontend/lib/types.ts` for the complete schema definitions shared between tiers.

---

## 8. End-to-end flow recipe

1. **Create vendor**
   ```ts
   const vendor = await createVendor({ name: 'Indra', websiteUrl: 'https://indra.es' })
   ```
2. **Create client**
   ```ts
   const client = await createClient(vendor.id, {
     vendorId: vendor.id,
     name: 'Telefónica',
     websiteUrl: 'https://telefonica.com',
     country: 'Spain',
     sectorHint: 'Telecommunications',
   })
   ```
3. **Create service offering**
   ```ts
   const service = await createService(vendor.id, {
     vendorId: vendor.id,
     name: 'Digital Transformation Platform',
     shortDescription: 'Cloud migration + automation + AI advisory',
     categoryTags: ['cloud', 'automation', 'ai'],
   })
   ```
4. **Generate dashboard with live progress**
   ```ts
   const { dashboardId } = await createDashboardWithProgress(
     vendor.id,
     {
       vendorId: vendor.id,
       clientId: client.id,
       serviceOfferingId: service.id,
       opportunityContext: 'Detailed deal background ...',
     },
     handleProgress
   )
   ```
5. **Consume dashboards**
   - Summaries: `await getAllDashboards()`
   - Full detail: `await getDashboard(dashboardId)`

---

## 9. Troubleshooting

| Symptom | Likely cause | Mitigation |
| --- | --- | --- |
| Log message `LLM generation failed, falling back to fake data` | Missing/invalid `OPENAI_API_KEY` or OpenAI outage | Provide a valid key, verify quota, retry. |
| `VendorId, name, and websiteUrl are required` (400) | Missing essentials when creating clients/services | Always include `vendorId` in the JSON body—even on nested routes. |
| SSE connection closes before `type: "complete"` | Browser/network interrupted or the agent threw | Re-run the request; inspect backend logs for the `stepId` emitted with `status: "error"`. |
| `No response body` thrown inside `createDashboardWithProgress` | Function executed during SSR where `ReadableStream` is unavailable | Only call the helper inside `"use client"` components on the browser. |

---

## 10. Next improvements

- Replace in-memory repositories with a persistent data store (e.g. Postgres) by updating `ClientService`, `VendorService`, etc.
- Add authentication or API keys before deploying any of the HTTP endpoints outside a trusted network.
- Wire the `PrioritiesCard` to real `strategicPriorities` data once the agents surface it consistently.
- Extend this document with sequence diagrams (see `docs/ARCHITECTURE.md`) once the LLM workflow stabilises.

Keep this reference synced with code whenever new endpoints, agents or UI components land to avoid undocumented behaviour.
