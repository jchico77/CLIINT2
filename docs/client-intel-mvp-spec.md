ClientIntel Dashboard MVP – Especificación Funcional y Técnica
0. Principios y reglas globales

Estas reglas son obligatorias para cualquier desarrollo que haga el agente en Cursor:

Trabajo por pasos con verificación del usuario

Tras cada paso significativo (commit lógico o bloque de trabajo: nueva entidad, nuevo endpoint, nueva vista, nueva integración LLM…), el agente debe parar y:

Explicar qué ha hecho.

Indicar cómo ejecutar/probar lo implementado.

Esperar confirmación del usuario antes de seguir al siguiente paso.

Buenas prácticas de ingeniería

Código modular, mantenible y escalable.

Separación clara de capas:

Dominio / lógica de negocio.

Infraestructura (LLM, I/O, HTTP).

Presentación (frontend).

Manejo de errores robusto.

Tipado estricto (TypeScript strict).

Funciones y componentes pequeños, con responsabilidades claras.

Pruebas mínimas donde tenga sentido (al menos unitarias o de integración básicas en partes clave).

CSS

Nunca usar CSS inline (ni style={{ ... }} en React).

Todo el estilo debe ir:

vía TailwindCSS, y/o

clases utilitarias definidas en ficheros CSS/SCSS centralizados.

No introducir librerías adicionales de UI innecesarias más allá de:

shadcn/ui

@tremor/react

Tailwind.

Documentación

Al término de cada fase (definidas más abajo), el agente debe:

Crear o actualizar un documento maestro de implementación, sugerido:
CLIINT2/docs/implementation-notes.md

Este documento debe incluir:

Qué se ha implementado en esa fase (lista concreta).

Decisiones técnicas tomadas.

Puntos pendientes o TODOs relevantes.

Cómo ejecutar y probar lo desarrollado hasta ese momento.

Estructura de proyecto

Toda la nueva aplicación se creará en un nuevo directorio en la raíz del repo:

CLIINT2/

Dentro de CLIINT2/ se seguirá una estructura limpia, por ejemplo:

CLIINT2/
  backend/
    src/
    package.json
    tsconfig.json
    ...
  frontend/
    app/
    components/
    package.json
    tsconfig.json
    ...
  docs/
    client-intel-mvp-spec.md
    implementation-notes.md
  README.md


Reutilización de código de la codebase actual

Se permite copiar ficheros, funciones, configuraciones, helpers, etc. de la codebase existente (CLIINT original).

No se debe integrar lógicamente con la app antigua:

Nada de importar módulos de CLIINT/ dentro de CLIINT2/.

Nada de compartir servicios o modelos directamente entre apps.

Cualquier reutilización debe ser:

Copiando el fichero o el bloque de código dentro de CLIINT2.

Adaptándolo a la nueva arquitectura si es necesario.

El resultado debe ser una aplicación totalmente independiente.

1. Objetivo del MVP

Nombre provisional: ClientIntel Dashboard MVP

Objetivo funcional:
Dado un vendor (nosotros), un cliente B2B y un servicio/solución que queremos vender, la aplicación genera un dashboard visual e interactivo que sintetiza:

Contexto del cliente y su mercado.

Prioridades estratégicas y dolores relevantes.

Stakeholders clave.

Contexto competitivo (del cliente y de nuestra categoría).

Encaje entre nuestras capacidades y la situación del cliente (plays).

Evidencias recomendadas (casos, KPIs, mensajes).

Gaps de información y preguntas inteligentes para el cliente.

Uso típico:
Antes de un kickoff o de una reunión importante, el equipo abre el dashboard de esa cuenta+servicio y:

Entiende el contexto en minutos.

Ve ángulos de entrada claros (plays).

Tiene preguntas inteligentes preparadas.

Tiene evidencias relevantes seleccionadas.

2. Flujo de usuario
2.1. Flujo principal (happy path)

Usuario accede a / y ve:

CTA: "Crear nuevo análisis de cliente".

Una lista simple de dashboards recientes (opcional en MVP).

Hace clic en "Nuevo análisis":

Se muestra formulario de Client & Deal Setup:

Vendor (normalmente ya fijo).

Cliente (crear o elegir).

Servicio/solución a vender (crear o elegir).

Contexto breve de la oportunidad (texto libre).

Posibilidad de subir 1–2 documentos (opcional).

Pulsa "Generar Strategy Dashboard":

El frontend llama al endpoint backend /api/vendors/:vendorId/dashboard.

Se muestra un estado de "Analizando" (spinner / progress).

El backend:

Ejecuta ClientResearchAgent.

Ejecuta VendorResearchAgent (si no hay data previa reutilizable).

Ejecuta FitAndStrategyAgent.

Persiste el ClientIntelDashboard.

El frontend es redirigido a /dashboard/:id:

Renderiza cards con las secciones principales.

Cada card es clickable → sheet/modal/accordion con detalle.

3. Modelo de dominio detallado
3.1. Entidades
Vendor
type Vendor = {
  id: string;
  name: string;
  websiteUrl: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

ServiceOffering
type ServiceOffering = {
  id: string;
  vendorId: string;
  name: string;                 // "Customer Data Platform", "Managed IT Support", etc.
  shortDescription: string;
  categoryTags: string[];       // p.ej. ["saas", "analytics"], ["consulting", "strategy"]
  createdAt: string;
  updatedAt: string;
};

ClientAccount
type ClientAccount = {
  id: string;
  vendorId: string;             // en multi-tenant, asociar cliente al vendor
  name: string;
  websiteUrl: string;
  country?: string;
  sectorHint?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

ClientIntelDashboard
type ClientIntelDashboard = {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityContext: string;
  generatedAt: string;
  llmModelUsed: string;
  sections: ClientIntelDashboardSections;
};

3.2. Estructura del Dashboard (repetimos + afinamos)

(Ya definida antes, pero Cursor debe respetar esto al 100%.)

type ClientIntelDashboardSections = {
  accountSnapshot: AccountSnapshotSection;
  marketContext: MarketContextSection;
  strategicPriorities: StrategicPrioritiesSection;
  stakeholderMap: StakeholderMapSection;
  competitiveLandscape: CompetitiveLandscapeSection;
  vendorFitAndPlays: VendorFitAndPlaysSection;
  evidencePack: EvidencePackSection;
  gapsAndQuestions: GapsAndQuestionsSection;
};


IMPORTANTE para Cursor:
Este tipo es el contrato entre backend y frontend.
Cualquier cambio en este tipo debe hacerse:

Primero en CLIINT2/docs/implementation-notes.md.

Después en backend y frontend, en una misma fase controlada.

Las definiciones de cada sección quedan como en el mensaje anterior (las mantienes igual), no las repito por longitud, pero en el doc real deben estar íntegras:

AccountSnapshotSection

MarketContextSection

StrategicPrioritiesSection

StakeholderMapSection

CompetitiveLandscapeSection

VendorFitAndPlaysSection

EvidencePackSection

GapsAndQuestionsSection

4. Arquitectura IA (agentes LLM) – Detalle adicional
4.1. Modelos recomendados

Extracción estructurada (JSON, fact extraction):

GPT-5.1 (modo Structured Outputs).

Síntesis estratégica / narrativa:

GPT-5.1 o Claude Sonnet 4.5.

MVP: se puede empezar con un solo modelo (GPT-5.1) para todo, siempre devolviendo JSON.

4.2. ClientResearchAgent – guía de prompt

Responsabilidad: generar:

accountSnapshot

marketContext

strategicPriorities (priorities + painPoints)

Esqueleto de prompt (texto, no código):

System:

Rol: "analista de negocio B2B".

Objetivo: entender el cliente a nivel empresa, mercado, prioridades.

Incluir:

Descripción de las estructuras objetivo (los tipos TS convertidos a JSON Schema).

Instrucciones:

No inventar datos financieros si no se encuentran.

Usar "unknown" cuando no haya info.

Priorizar información relevante para decisiones B2B (no curiosidades).

Tools (si hay):

Llamadas a web/news.

Lectura de docs.

Salida:
JSON parcial con:

{
  "accountSnapshot": { ... },
  "marketContext": { ... },
  "strategicPriorities": { ... }
}

4.3. VendorResearchAgent – guía de prompt

Responsabilidad:

service_offerings

vendor_differentiators

vendor_evidence (que luego se transformará a EvidenceItem)

Debe:

Leer web corporativa del vendor.

Extraer servicios en lenguaje de negocio claro.

Detectar claims/diferenciadores respaldados por algo (ranking, casos, etc.).

4.4. FitAndStrategyAgent – guía de prompt

Responsabilidad final:

Convertir:

JSON cliente,

JSON vendor,

servicio específico,

contexto de la oportunidad,

en un ClientIntelDashboardSections completo.

Debe:

Aplicar un mini-playbook de estrategia B2B:

Mapear prioridades ↔ capacidades.

Definir plays.

Elegir evidencias.

Identificar gaps y preguntas.

5. Arquitectura backend – Detalle
5.1. Stack y estructura sugerida

CLIINT2/backend/:

backend/
  src/
    config/
      env.ts
      llm.ts       // configuración de clientes LLM
    domain/
      models/
        vendor.ts
        serviceOffering.ts
        clientAccount.ts
        clientIntelDashboard.ts
      services/
        dashboardService.ts
        vendorService.ts
        clientService.ts
    llm/
      clientResearchAgent.ts
      vendorResearchAgent.ts
      fitAndStrategyAgent.ts
    http/
      routes/
        vendors.ts
        clients.ts
        services.ts
        dashboard.ts
      server.ts
  package.json
  tsconfig.json


Se puede usar Express, Fastify o Nest. Si la codebase actual ya tiene algo, se puede copiar la configuración base a CLIINT2/backend (respetando la regla de independencia).

5.2. Endpoints detallados
Vendors
POST /api/vendors
GET  /api/vendors/:vendorId

Service offerings
POST /api/vendors/:vendorId/services
GET  /api/vendors/:vendorId/services
GET  /api/services/:serviceId

Clients
POST /api/vendors/:vendorId/clients
GET  /api/vendors/:vendorId/clients
GET  /api/clients/:clientId

Dashboard – síncrono (MVP)
POST /api/vendors/:vendorId/dashboard
Body:
{
  "clientId": "string",
  "serviceOfferingId": "string",
  "opportunityContext": "string",
  "uploadedDocIds": ["string"] // opcional
}

Response:
{
  "dashboardId": "string",
  "dashboard": ClientIntelDashboard
}


Implementación:

Leer vendor, client, service.

Ejecutar ClientResearchAgent.

Ejecutar VendorResearchAgent (o reutilizar datos si ya existen).

Ejecutar FitAndStrategyAgent.

Persistir ClientIntelDashboard.

Devolverlo.

6. Arquitectura frontend – Detalle
6.1. Stack y estructura

CLIINT2/frontend/:

frontend/
  app/
    layout.tsx
    page.tsx              // home/dashboard list
    clients/
      new/page.tsx        // formulario nuevo análisis
    dashboard/
      [id]/page.tsx       // vista dashboard cliente
  components/
    ui/                   // componentes shadcn
    dashboard/
      AccountSnapshotCard.tsx
      MarketContextCard.tsx
      PrioritiesCard.tsx
      StakeholderCard.tsx
      CompetitiveCard.tsx
      VendorFitCard.tsx
      EvidenceCard.tsx
      GapsQuestionsCard.tsx
  lib/
    api.ts                // helpers fetch a backend
    types.ts              // tipos compartidos con backend (copiados, no importados)
  package.json
  tailwind.config.js
  tsconfig.json

6.2. Componentes clave

AccountSnapshotCard

Recibe AccountSnapshotSection.

Muestra resumen, indicadores KPIs, botón "Ver detalle" → Dialog/Sheet.

MarketContextCard

Usa Tremor para:

BarList o CategoryBar de tendencias.

Timeline simple de eventos (lista ordenada).

PrioritiesCard

Lista de prioridades.

Para cada una:

nombre,

descripción,

barra de relevancia (relevanceToService).

Acordeones con pain points vinculados.

StakeholderCard

Tabla (Table shadcn) con:

nombre,

rol,

influencia,

stance.

Drilldown por stakeholder.

CompetitiveCard

Lista simple de competidores cliente / vendor / alternativas.

Badges para type.

VendorFitCard

Semáforo global (overallFit).

Lista de fitDimensions.

Tarjetas de recommendedPlays.

EvidenceCard

Lista de EvidenceItem.

Botones "Copiar snippet".

GapsQuestionsCard

Tabla de gaps con impacto.

Lista de preguntas con botón "Copiar".

Todo usando shadcn + Tailwind, sin CSS inline.

7. Fases de implementación (para guiar a Cursor)
Fase 1 – Esqueleto de proyecto y dominio básico

Objetivo: tener CLIINT2 creado, con backend y frontend mínimos y tipos compartidos.

Tareas:

Crear directorio CLIINT2/ en la raíz.

Crear backend/ y frontend/ según estructuras propuestas.

Configurar TypeScript, ESLint (opcional), scripts dev y build.

Definir tipos de dominio en backend: Vendor, ServiceOffering, ClientAccount, ClientIntelDashboardSections y todas sus secciones.

Crear un endpoint de prueba /api/health en backend.

Crear frontend Next.js con página / que llame a /api/health y lo muestre.

Al terminar Fase 1, actualizar docs/implementation-notes.md y parar para que el usuario pruebe.

Fase 2 – Endpoints dominio + JSON de dashboard fake

Objetivo: poder crear vendor, servicio, cliente y recibir un dashboard "fake" con el JSON correcto (sin LLM todavía).

Tareas:

Implementar endpoints:

POST/GET Vendor.

POST/GET ServiceOffering.

POST/GET ClientAccount.

Implementar endpoint POST /api/vendors/:vendorId/dashboard que:

Valide clientId, serviceOfferingId.

Devuelva un ClientIntelDashboard con datos fake pero respetando la estructura.

En frontend:

Página /clients/new con formulario.

Redirección a /dashboard/:id usando el ID devuelto.

Página /dashboard/:id que renderice todas las cards a partir del JSON fake.

Al terminar Fase 2, actualizar implementation-notes.md y parar para que el usuario pruebe UI + flujo (aunque sea con datos ficticios).

Fase 3 – Integración LLM (Client & Vendor Research)

Objetivo: conectar LLM para que rellene las secciones de cliente y vendor.

Tareas:

Crear llm/ con configuración de cliente GPT-5.1.

Implementar ClientResearchAgent:

Prompt estructurado.

Llamada al modelo.

Mapping del output a las secciones correspondientes.

Implementar VendorResearchAgent:

Idem, pero para vendor.

Adaptar /api/vendors/:vendorId/dashboard para usar estos agentes en vez de datos fake (al menos en la mitad del JSON).

Añadir logging mínimo para debug (sin exponer secretos).

Final Fase 3: actualizar implementation-notes.md, parar y que el usuario pruebe con 1–2 clientes reales.

Fase 4 – Fit & Strategy Agent + pulido del dashboard

Objetivo: completar toda la lógica del dashboard con estrategia, plays, evidencias, gaps y preguntas.

Tareas:

Implementar FitAndStrategyAgent:

Consumir output de Client+Vendor.

Rellenar:

vendorFitAndPlays

evidencePack

gapsAndQuestions

refinamiento de stakeholderMap y competitiveLandscape.

Integrar este agente en el endpoint /dashboard.

Ajustar frontend para mostrar correctamente:

Plays,

evidencias,

gaps y preguntas.

Añadir botones de copiar, marcar validado, etc.

Final Fase 4: actualizar implementation-notes.md, parar para prueba end-to-end.

Fase 5 – Hardening, UX y refinamientos

Manejo de errores y estados de carga más pulidos.

Ajustes visuales (sin cambiar estructura base).

Pequeños tests de integración si procede.

