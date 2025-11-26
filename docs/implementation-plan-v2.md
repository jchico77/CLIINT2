# CLIINT2 – Plan de implementación v2 (post-auditoría)

Este documento define el plan de evolución de CLIINT2 tras la auditoría del MVP actual.  
El objetivo es pivotar hacia una aplicación centrada en **oportunidades comerciales B2B** y aprovechar de forma inteligente las capacidades nativas de la API de OpenAI:

- Modelos: **GPT-5.1**, **o3-deep-research** / **o4-mini-deep-research**
- Features: **Structured Outputs**, **File Search**, **File Inputs**, **Tools / Function Calling**, **Reasoning Effort**, **Prompt Caching**

---

## 0. Principios y restricciones

1. **Directorio aislado**
   - Toda la app nueva sigue viviendo en `CLIINT2/`.
   - Se pueden COPIAR ficheros/código de la app antigua, pero nunca importar nada desde fuera de `CLIINT2`.

2. **Calidad de ingeniería**
   - TypeScript estricto.
   - Separación clara:
     - `domain` (modelos, servicios),
     - `llm` (agentes),
     - `http` (rutas),
     - `frontend` (Next + UI).
   - Manejo de errores consistente (no `try/catch` salpicados sin sentido).

3. **CSS**
   - **Prohibido inline CSS** (`style={{ ... }}`).
   - siempre Tailwind + shadcn/ui + utilidades propias.

4. **Trabajo por pasos (muy importante)**
   - Tras cada bloque de tareas (subfase), el agente de Cursor debe:
     - Explicar qué ha hecho.
     - Decir cómo probarlo (comandos y URL).
     - Parar y esperar confirmación del usuario antes de seguir.

5. **Documentación interna**
   - Mantener `CLIINT2/docs/implementation-notes.md` actualizado al final de cada fase.
   - Este `implementation-plan-v2.md` describe el "qué"; `implementation-notes.md` describe el "cómo se ha ido haciendo".

6. **Modelos y features de OpenAI**
   - Investigación de cliente/mercado: **Deep Research API** (`o3-deep-research-2025-06-26` o `o4-mini-deep-research-2025-06-26`).
   - Razonamiento y generación de dashboard/outline: **GPT-5.1** (Responses API).
   - Para dashboard y agentes:
     - **Structured Outputs** (JSON Schema).
     - **Tools**: `file_search`, `web_search` (si procede), tools custom contra nuestro backend.
     - **File Search** / **File Inputs** para dossier de oportunidad y biblioteca de evidencias.
     - Ajustar **reasoning_effort** según tarea.

---

## 1. Arquitectura lógica v2

### 1.1. Entidades principales

Además de las ya existentes (`Vendor`, `ServiceOffering`, `ClientAccount`, `ClientIntelDashboard`), introducimos:

1. **`Opportunity`**
   - Representa una operación concreta (deal) para un cliente y servicio.

   ```ts
   type OpportunityStage =
     | "early"
     | "rfp"
     | "shortlist"
     | "bafo"
     | "won"
     | "lost";

   type Opportunity = {
     id: string;
     vendorId: string;
     clientId: string;
     serviceOfferingId: string;
     name: string;
     stage: OpportunityStage;
     estimatedValue?: number;
     currency?: string;
     deadline?: string;
     ownerUserId?: string;
     notes?: string;
     createdAt: string;
     updatedAt: string;
   };
   ```

2. **`OpportunityDossier`**
   - Representa el "paquete" de información de la oportunidad (RFPs, emails, notas, etc.).
   - En v2 puede ser:
     - un tipo propio en dominio, y
     - almacenado como campo JSON en `Opportunity` o como entidad separada.

   ```ts
   type DossierSourceType = "rfp" | "brief" | "email" | "meeting_notes" | "other";

   type DossierTextChunk = {
     id: string;
     sourceType: DossierSourceType;
     title?: string;
     content: string;
   };

   type OpportunityDossier = {
     opportunityId: string;
     textChunks: DossierTextChunk[];
     // Opcional: IDs de files en OpenAI File Search
     openAiFileIds?: string[];
   };
   ```

3. **`EvidenceItem`** (concepto, aunque la implementación completa puede llegar más adelante)
   - Base para la "Evidence Library".

   ```ts
   type EvidenceItem = {
     id: string;
     title: string;
     clientOrContext: string;
     sector?: string;
     geography?: string;
     serviceCategory?: string;
     problem: string;
     solution: string;
     kpis: string[];
     whyRelevantHere: string;
     sourceType: "public" | "internal";
     underlyingFileId?: string; // ID de File Search, opcional
   };
   ```

### 1.2. Relación con el dashboard

En v2, el dashboard deja de ser "por cliente" y pasa a ser "por oportunidad":

```ts
type ClientIntelDashboard = {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityId: string;
  opportunityContext: string; // redundante pero útil
  generatedAt: string;
  llmModelUsed: string;
  sections: ClientIntelDashboardSections;
};
```

El endpoint de generación también cambia:
- `POST /api/vendors/:vendorId/opportunities/:opportunityId/dashboard`

---

## 2. Integración con OpenAI – diseño general

### 2.1. Deep Research (o3 / o4-mini)

**Uso:** investigación de cliente/sector/competidores.

**Implementación:**
- Servicio `OpenAiDeepResearchClient` (en `backend/src/llm/deepResearchClient.ts`).
- Llamadas a `o3-deep-research-2025-06-26` o `o4-mini-deep-research-2025-06-26`.

**Input:**
- `clientName`, `clientWebsite`, `country`, `sectorHint`, `serviceOfferingName`.

**Output:**
- Informe estructurado en JSON con campos:
  - `businessModel`
  - `marketSegments`
  - `strategicThemes`
  - `keyRisks`
  - `competitors`
  - `macroTrends`…

Este informe se pasa como input a `ClientResearchAgent`.

### 2.2. GPT-5.1 + Structured Outputs + Tools

`ClientResearchAgent`, `VendorResearchAgent`, `FitAndStrategyAgent` y `ProposalOutlineAgent` se implementan con **GPT-5.1** (Responses API) usando:

- **Structured Outputs:** JSON Schema derivado de los tipos TS.
- **Tools:**
  - `file_search` (dossier + evidencias).
  - Tools custom (por ejemplo, `getOpportunityMeta`, `getEvidenceItemById`) que llaman a nuestro backend.
- **Reasoning Effort:**
  - `low` para extracción simple o resúmenes.
  - `medium`/`high` para Fit & Strategy y outline de propuesta.

### 2.3. File Search y File Inputs

**OpportunityDossier:**
- Los PDFs de RFP/briefs se suben como files a OpenAI.
- Se asocian al `opportunityId` y se guardan sus `file_id` en `OpportunityDossier.openAiFileIds`.
- Los agentes usan `file_search` con un índice específico para esa oportunidad.

**Evidence Library (más adelante):**
- Se suben decks/CS en File Search.
- `EvidencePack` y `ProposalOutline` consultan ahí.

---

## 3. Plan por fases y subfases

### Fase 1 – Refactor de dominio: introducir Opportunity y reanclar el dashboard

**Objetivo:** que el modelo de datos refleje oportunidades, no solo accounts.

#### F1.1 – Backend: modelo y endpoints de Opportunity

- ✅ Crear tipo TS `Opportunity` en `backend/src/domain/models/opportunity.ts`.
- ✅ Implementar un repositorio simple (por ahora memoria) en `domain/services/opportunityService.ts`:
  - `createOpportunity`
  - `getOpportunityById`
  - `listOpportunitiesByVendor`
- ✅ Crear rutas HTTP en `backend/src/http/routes/opportunities.ts`:
  - `POST /api/vendors/:vendorId/opportunities`
  - `GET /api/vendors/:vendorId/opportunities`
  - `GET /api/opportunities/:opportunityId`
- ✅ Añadir las rutas a `server.ts`.

**Parada:** actualizar `implementation-notes.md`, indicar endpoints nuevos y cómo probarlos (curl / Thunder Client / Postman).  
Esperar validación del usuario.

#### F1.2 – Backend: dashboard ligado a Opportunity

- ✅ Modificar `ClientIntelDashboard` para incluir `opportunityId`.
- ✅ Crear nuevo endpoint:
  - `POST /api/vendors/:vendorId/opportunities/:opportunityId/dashboard`
- ✅ Mantener el antiguo `POST /api/vendors/:vendorId/dashboard` como "legacy" solo de transición (puede devolver error o delegar internamente a una oportunidad temporal, pero la meta es retirarlo).
- ✅ Adaptar `DashboardService.generateDashboard` para trabajar con `Opportunity`:
  - Leer `Opportunity` y `ClientAccount` y `ServiceOffering` por IDs.
  - Usar `opportunity.notes` / `opportunityContext` como contexto de oportunidad.

**Parada:** documentar el cambio, explicar qué endpoint hay que usar a partir de ahora y cómo generar un dashboard "dummy" para probar.

#### F1.3 – Frontend: flujo de creación con Opportunity

- ✅ Crear página `/opportunities/new`:
  - Formulario:
    - Vendor (si aplica),
    - Client (select o creación rápida),
    - ServiceOffering,
    - Name de la oportunidad,
    - Stage inicial (early por defecto),
    - Deadline opcional,
    - Textarea para notes / opportunityContext.
  - Al guardar, redirigir a `/opportunities/[id]`.
- ✅ Página `/opportunities/[id]`:
  - Mostrar metadatos de la oportunidad.
  - Botón "Generar Strategy Dashboard".
  - Botón lleva a:
    - llamada a `POST /api/vendors/:vendorId/opportunities/:opportunityId/dashboard`.
    - redirección a `/dashboard/[dashboardId]`.
- ✅ Ajustar la home (`/`) para:
  - Mostrar lista simple de oportunidades (aunque sea en memoria).
  - Reemplazar el flujo antiguo de "crear cliente+service+contexto→dashboard directo" por "crear oportunidad→dashboard".

**Parada:** actualizar `implementation-notes.md`, explicar nuevo flujo UI y cómo probarlo end-to-end.

---

### Fase 2 – Dossier de oportunidad + File Inputs + File Search (mínimo viable)

**Objetivo:** que la app ingiera materiales reales de la oportunidad, no solo contexto textual.

#### F2.1 – Backend: OpportunityDossier básico

- ⬜ Crear `OpportunityDossier` en `domain/models/opportunityDossier.ts`.
- ⬜ Crear `opportunityDossierService`:
  - Métodos:
    - `appendTextChunk(opportunityId, chunk)`
    - `listTextChunks(opportunityId)`
    - `attachFileId(opportunityId, fileId)` (para File Search)
- ⬜ Por ahora, almacenar en memoria (puede ser un simple `Map<opportunityId, OpportunityDossier>`).

#### F2.2 – Backend: endpoints para dossier

- ⬜ `POST /api/opportunities/:opportunityId/dossier/text`:
  - Body: `{ sourceType, title?, content }`.
- ⬜ `GET /api/opportunities/:opportunityId/dossier`:
  - Devuelve todos los `textChunks`.
- ⬜ `POST /api/opportunities/:opportunityId/dossier/files`:
  - Accepta upload de 1 archivo (PDF/Doc).
  - Lo sube a OpenAI como file (File Inputs).
  - Guarda el `file_id` en `OpportunityDossier.openAiFileIds`.

**Parada:** documentar cómo hacer:
- un POST texto (notas/email),
- un upload PDF (RFP),
- y cómo ver el dossier.

#### F2.3 – Frontend: UI para alimentar dossier

- ⬜ En `/opportunities/[id]`, añadir:
  - Sección "Dossier de oportunidad" con:
    - Textarea para añadir notas/emails (envío a `/dossier/text`).
    - Listado de `textChunks`.
    - Upload de 1 archivo (input file) que llame a `/dossier/files`.
- ⬜ No es necesario UI sofisticada, pero debe ser usable para pegar un email largo y subir una RFP.

**Parada:** actualizar `implementation-notes.md` y probar flujo:  
crear oportunidad → añadir texto + PDF → comprobar que el backend los conoce.

---

### Fase 3 – Deep Research API para cliente/sector

**Objetivo:** sustituir el "pseudo-deep-research" manual por el servicio oficial de Deep Research.

#### F3.1 – Cliente OpenAiDeepResearchClient

- ⬜ Crear `backend/src/llm/deepResearchClient.ts`.
- ⬜ Implementar función:

```ts
async function runClientDeepResearch(input: {
  clientName: string;
  clientWebsiteUrl?: string;
  country?: string;
  sectorHint?: string;
  serviceOfferingName: string;
}): Promise<ClientDeepResearchReport> { ... }
```

- ⬜ Usar el modelo `o3-deep-research-2025-06-26` (o `o4-mini` si se configura así en env).
- ⬜ Definir `ClientDeepResearchReport` (modelo propio) con campos:
  - `businessModel`
  - `marketSegments`
  - `strategicThemes`
  - `risks`
  - `macroTrends`
  - `competitors`
  - etc.

#### F3.2 – Integración en DashboardService / deepResearchService.ts

- ⬜ Reescribir o adaptar `deepResearchService.ts` para:
  - Llamar a `OpenAiDeepResearchClient`.
  - No hacer orquestación manual de web scraping si ya no es necesario.
- ⬜ `ClientResearchAgent` debe recibir:
  - `clientAccount` + `serviceOffering` + `deepResearchReport`.
- ⬜ Reducir la responsabilidad de `ClientResearchAgent` a:
  - interpretar y transformar el `deepResearchReport` en:
    - `AccountSnapshotSection`
    - `MarketContextSection`
    - `StrategicPrioritiesSection` (parcial),
  - integrando también info del dossier cuando llegue.

**Parada:** documentar el flujo:  
Entrada → Deep Research → ClientResearchAgent → JSON de secciones.  
Probar con una empresa real.

---

### Fase 4 – Rework de agentes con GPT-5.1 + Structured Outputs + Tools

**Objetivo:** hacer los agentes más robustos, con JSON garantizado y acceso directo a dossier/evidencias.

#### F4.1 – Definir JSON Schemas para todas las secciones

- ⬜ A partir de `clientIntelDashboard.ts`, generar o escribir a mano esquemas JSON para:
  - `AccountSnapshotSection`
  - `MarketContextSection`
  - `StrategicPrioritiesSection`
  - `StakeholderMapSection`
  - `CompetitiveLandscapeSection`
  - `VendorFitAndPlaysSection`
  - `EvidencePackSection`
  - `GapsAndQuestionsSection`
  - (y `ProposalOutlineLite` cuando exista)
- ⬜ Guardarlos en `backend/src/llm/schemas/*.json`.

#### F4.2 – ClientResearchAgent con GPT-5.1 + Structured Output

- ⬜ Reescribir `clientResearchAgent.ts` para:
  - Usar GPT-5.1 Responses API.
  - `response_format` = Structured Output con el schema conjunto de:
    - `AccountSnapshotSection`
    - `MarketContextSection`
    - `StrategicPrioritiesSection` (limitando nº de items según Fase 5).
  - Input:
    - `clientAccount`, `serviceOffering`,
    - `deepResearchReport`,
    - `opportunityDossierText` (resumen de textChunks) – solo texto, sin File Search aún.
- ⬜ Establecer `reasoning_effort`:
  - `medium` para este agente.

**Parada:** probar un caso end-to-end y validar que el JSON cumple esquema sin Zod "parcheando".

#### F4.3 – VendorResearchAgent con GPT-5.1 + File Search (libería de evidencias ligera)

- ⬜ Reescribir `vendorResearchAgent.ts` para:
  - Usar GPT-5.1 con Structured Output hacia `EvidencePackSection`.
  - Utilizar `file_search` sobre un índice de evidencias (puede ser inicial, incluso vacío).
- ⬜ Inicialmente, si no hay evidencias subidas, generar evidencias "generales" basadas en web corporativa del vendor.
- (La parte gruesa de Evidence Library vendrá después; aquí basta con soportar File Search como capability.)

#### F4.4 – FitAndStrategyAgent con GPT-5.1 + Tools

- ⬜ Reescribir `fitAndStrategyAgent.ts` para:
  - Usar GPT-5.1 con Structured Output hacia:
    - `StakeholderMapSection`
    - `CompetitiveLandscapeSection`
    - `VendorFitAndPlaysSection`
    - `GapsAndQuestionsSection`
  - Declarar tools:
    - `file_search` sobre dossier de oportunidad.
    - `getOpportunityMeta` (tool custom que llama a nuestro backend para stage, deadline, value, etc.).
    - `getClientDeepResearchReport` (opcional, o pasar el contenido como input directo).
- ⬜ Configurar `reasoning_effort = high`:
  - Es el corazón estratégico del sistema.

**Parada:** documentar cómo está usando tools y cómo se ve un ejemplo real de salida.

---

### Fase 5 – Mejora semántica del dashboard: priorización + outline de propuesta

**Objetivo:** que el dashboard sea accionable en 10–15 minutos y se conecte con la futura propuesta.

#### F5.1 – Limitar cardinalidad y añadir campos de prioridad

- ⬜ Modificar tipos de secciones para incluir:
  - límites lógicos (documentados en comentarios / doc):
    - priorities máx 3,
    - painPoints máx 3–4,
    - stakeholders máx 6–8,
    - smartQuestions máx 8, etc.
  - añadir campos:
    - `isCritical?: boolean` en `SmartQuestion`.
    - `priorityLevel?: "must" | "should" | "nice"` en prioridades, gaps, etc.
- ⬜ Ajustar prompts de los agentes para:
  - NO generar más elementos de los permitidos.
  - Marcar qué es crítico y por qué.
- ⬜ Ajustar cards de frontend:
  - Destacar visualmente lo crítico.
  - Evitar que las listas largas colapsen la UX (por diseño).

#### F5.2 – ProposalOutlineLite + UI de "borrador de propuesta"

- ⬜ Definir tipo en `clientIntelDashboard.ts`:

```ts
type ProposalSectionSuggestion = {
  id: string;
  title: string;
  purpose: string;
  suggestedContent: string[];
  linkedEvidenceIds: string[];
};

type ProposalOutlineLite = {
  sections: ProposalSectionSuggestion[];
};
```

- ⬜ Crear nuevo agente `proposalOutlineAgent.ts`:
  - GPT-5.1 + Structured Output → `ProposalOutlineLite`.
  - Input:
    - `ClientIntelDashboardSections`,
    - `EvidencePack`,
    - `Opportunity` (stage, deadline, value).
  - Tools:
    - `getEvidenceItemById` (si ya hay librería),
    - `file_search` (opcional) para encontrar material relevante.
- ⬜ Backend:
  - Ampliar `ClientIntelDashboard` para incluir `proposalOutline?: ProposalOutlineLite`.
  - O exponer endpoint separado:
    - `POST /api/dashboard/:dashboardId/proposal-outline`.
- ⬜ Frontend:
  - En `/dashboard/[id]`:
    - Card "Esquema de propuesta sugerido":
      - Lista de secciones con título y propósito.
      - Botón "Copiar outline" (texto/Markdown).

**Parada:** documentar cómo se genera el outline, qué datos usa y cómo probarlo.

---

### Fase 6 – Persistencia mínima y vista de oportunidades (si aún está en memoria)

**Objetivo:** que el sistema pueda usarse en varias oportunidades y sesiones sin perder estado.

(Si ya has introducido DB en paralelo, adaptar esta fase.)

- ⬜ Introducir SQLite + Prisma u otro ORM ligero.
- ⬜ Tablas:
  - `vendors`, `clients`, `service_offerings`, `opportunities`, `dashboards`, `dossiers`, `evidence_items`.
- ⬜ Adaptar servicios de dominio para usar la DB en vez de memoria.
- ⬜ Página `/opportunities`:
  - Tabla con:
    - nombre de la oportunidad,
    - cliente,
    - stage,
    - deadline,
    - link a dashboard (si existe).

**Parada:** documentar migración mínima y cómo probar la persistencia.

---

## 4. Resumen de prioridades

Si el tiempo/energía es limitado, el orden de impacto real para ventas es:

1. **Fase 1 + Fase 2** → Oportunidad + dossier real.
2. **Fase 3 + Fase 4** → Deep Research + GPT-5.1 con Structured Outputs y File Search.
3. **Fase 5** → Dashboard accionable + outline de propuesta.
4. **Fase 6** → Persistencia sólida y vista de oportunidades.

La clave: que el dashboard deje de ser "research bonito" y pase a ser el kickoff operativo de una oportunidad real, alimentado por:

- investigación seria (Deep Research API),
- dossier de la oportunidad (File Search),
- conocimiento de mejores prácticas (instrucciones B2B en prompts),
- y conectado con la construcción de la propuesta (outline).
