# Análisis: Implementación de Vendor Deep Research

## Objetivo

Implementar una funcionalidad que, dado el nombre y URL del website de un vendor, realice un análisis profundo que genere:
- Información sobre a qué se dedica
- Su oferta de servicios
- Propuesta de valor
- Servicios bien descritos
- Casos de éxito
- Y otra información relevante

## Análisis de Código Existente Reutilizable

### ✅ 1. Infraestructura de LLM y Web Search

**Componentes reutilizables:**

- **`backend/src/llm/deepResearchClient.ts`** - Función `runClientDeepResearch()`
  - ✅ Patrón completo de deep research con web search
  - ✅ Manejo de timeouts y heartbeats
  - ✅ Soporte para reasoning effort
  - ✅ Uso de `buildToolsForModel()` para web search
  - ✅ Extracción de structured output
  - ✅ Manejo de errores robusto

- **`backend/src/llm/deepResearchService.ts`** - Clase `DeepResearchService`
  - ✅ Wrapper service para deep research
  - ✅ Métodos `researchCompetitors()` y `researchNews()` como ejemplos de análisis adicionales
  - ✅ Patrón de prompts estructurados con JSON schema

**Reutilización:** Podemos crear `runVendorDeepResearch()` siguiendo el mismo patrón que `runClientDeepResearch()`, adaptando el schema y prompts.

### ✅ 2. Modelos de Datos y Schemas

**Componentes reutilizables:**

- **`backend/src/domain/models/clientDeepResearchReport.ts`**
  - ✅ Estructura de `ClientDeepResearchInput` (nombre, website, país, sector)
  - ✅ Estructura de `ClientDeepResearchReport` (summary, businessModel, marketSegments, etc.)
  - ✅ Podemos crear `VendorDeepResearchInput` y `VendorDeepResearchReport` siguiendo el mismo patrón

- **`backend/src/llm/schemas/`** - Sistema de schemas JSON
  - ✅ `loadDashboardSchema()` para cargar schemas
  - ✅ Podemos crear un nuevo schema `vendorDeepResearch.json` siguiendo el patrón existente

**Reutilización:** Crear modelos similares pero adaptados a vendors:
- `VendorDeepResearchInput` (name, websiteUrl, description opcional)
- `VendorDeepResearchReport` (summary, businessModel, valueProposition, services, caseStudies, etc.)

### ✅ 3. Utilidades y Helpers

**Componentes reutilizables:**

- **`backend/src/llm/modelCapabilities.ts`**
  - ✅ `getModelCapabilities()` - Detecta capacidades del modelo
  - ✅ `buildToolsForModel()` - Construye tools (web search, file search) según modelo
  - ✅ Soporte para diferentes modelos (GPT-4o, O1, etc.)

- **`backend/src/llm/phaseLogger.ts`**
  - ✅ `logPhaseStart()` - Logging de inicio de fase
  - ✅ Podemos usar para loggear el inicio del vendor research

- **`backend/src/utils/llmLogger.ts`** (nuevo, recién creado)
  - ✅ `logLLMCall()` - Logging de llamadas LLM
  - ✅ `logPhaseResult()` - Logging de resultados de fase
  - ✅ Sistema completo de logging por oportunidad/fase

**Reutilización:** Todas estas utilidades se pueden usar directamente.

### ✅ 4. Configuración LLM

**Componentes reutilizables:**

- **`backend/src/config/llm.ts`**
  - ✅ `llmConfig.deepResearchModel` - Modelo para deep research
  - ✅ `llmConfig.deepResearchReasoningEffort` - Nivel de reasoning
  - ✅ `llmConfig.deepResearchTimeoutMs` - Timeout
  - ✅ `llmConfig.featureToggles.webSearch` - Toggle de web search
  - ✅ `llmConfig.temperatureOverrides` - Overrides de temperatura
  - ✅ `llmConfig.tokenLimits` - Límites de tokens

**Reutilización:** Podemos añadir configuraciones específicas para vendor research:
- `llmConfig.vendorDeepResearchModel`
- `llmConfig.vendorDeepResearchReasoningEffort`
- `llmConfig.vendorDeepResearchTimeoutMs`

### ✅ 5. Servicios y Persistencia

**Componentes reutilizables:**

- **`backend/src/domain/services/vendorService.ts`**
  - ✅ CRUD básico de vendors
  - ✅ Podemos extender para guardar el análisis

- **`backend/src/utils/dashboardCache.ts`**
  - ✅ `savePhase()` y `loadPhase()` - Sistema de cache por fase
  - ✅ Podemos usar para cachear resultados de vendor research

**Reutilización:** Podemos crear un servicio `VendorResearchService` similar a `DeepResearchService`.

### ✅ 6. Patrón de Agentes

**Componentes reutilizables:**

- **`backend/src/llm/vendorResearchAgent.ts`** - Ya existe pero limitado
  - ✅ Estructura básica de agente
  - ✅ Uso de schemas estructurados
  - ⚠️ Actualmente solo analiza vendor + service específico
  - ⚠️ No usa web search (solo file search opcional)
  - ⚠️ No genera análisis profundo completo

**Reutilización:** Podemos crear un nuevo `VendorDeepResearchAgent` o extender el existente.

### ✅ 7. Rutas HTTP

**Componentes reutilizables:**

- **`backend/src/http/routes/vendors.ts`**
  - ✅ Rutas básicas: POST `/vendors`, GET `/vendors`, GET `/vendors/:vendorId`
  - ✅ Podemos añadir: POST `/vendors/:vendorId/analyze` o POST `/vendors/analyze`

**Reutilización:** Añadir nueva ruta para trigger del análisis.

## Lo que FALTA Implementar

### ❌ 1. Modelo de Datos para Vendor Deep Research

**Necesario crear:**

- **`backend/src/domain/models/vendorDeepResearchReport.ts`**
  ```typescript
  export interface VendorDeepResearchInput {
    vendorName: string;
    vendorWebsiteUrl: string;
    description?: string; // Opcional, si ya existe
  }

  export interface VendorDeepResearchReport {
    vendorName: string;
    summary: string;
    businessModel: string;
    valueProposition: string;
    marketSegments: string[];
    services: Array<{
      name: string;
      description: string;
      categoryTags: string[];
      keyFeatures: string[];
    }>;
    caseStudies: Array<{
      title: string;
      client: string;
      challenge: string;
      solution: string;
      results: string[];
      source?: string;
    }>;
    differentiators: Array<{
      claim: string;
      evidence: string;
      source?: string;
    }>;
    awards: Array<{
      name: string;
      year?: string;
      source?: string;
    }>;
    partnerships: Array<{
      partner: string;
      type: string;
      description: string;
    }>;
    sources: Array<{
      title: string;
      url?: string;
      snippet: string;
    }>;
  }
  ```

### ❌ 2. Schema JSON para Structured Output

**Necesario crear:**

- **`backend/src/llm/schemas/vendorDeepResearch.json`**
  - Schema completo que defina la estructura del output
  - Similar a los schemas existentes en `schemas/`

### ❌ 3. Cliente de Deep Research para Vendors

**Necesario crear:**

- **`backend/src/llm/vendorDeepResearchClient.ts`**
  - Función `runVendorDeepResearch(input: VendorDeepResearchInput, options?)`
  - Reutilizar patrón de `deepResearchClient.ts`:
    - ✅ Timeout handling
    - ✅ Heartbeat logging
    - ✅ Web search integration
    - ✅ Structured output extraction
    - ✅ Error handling

**Diferencias clave:**
- Prompt adaptado para análisis de vendor (no cliente)
- Schema diferente (vendorDeepResearch.json)
- Enfoque en servicios, casos de éxito, propuesta de valor

### ❌ 4. Servicio de Vendor Deep Research

**Necesario crear:**

- **`backend/src/llm/vendorDeepResearchService.ts`** o extender `deepResearchService.ts`
  - Método `getVendorReport(vendor: Vendor): Promise<VendorDeepResearchReport>`
  - Similar a `DeepResearchService.getClientReport()`

### ❌ 5. Persistencia del Análisis

**Opciones:**

**Opción A: Extender modelo Vendor en Prisma**
- Añadir campo `deepResearchReport` (JSON) a la tabla `Vendor`
- Migración de Prisma necesaria

**Opción B: Tabla separada**
- Crear tabla `VendorDeepResearchReport`
- Relación 1:1 con `Vendor`
- Más flexible para versionado

**Opción C: Cache en archivos (como dashboard phases)**
- Usar `savePhase()` y `loadPhase()` con `vendorId` como key
- Similar a cómo se cachean las fases del dashboard

**Recomendación:** Opción B (tabla separada) para mejor estructura y versionado.

### ❌ 6. Ruta HTTP para Trigger del Análisis

**Necesario crear:**

- **`POST /api/vendors/:vendorId/analyze`** o **`POST /api/vendors/analyze`**
  - Input: `{ name: string, websiteUrl: string }` o solo `vendorId`
  - Output: `VendorDeepResearchReport`
  - Integrar logging con `llmLogger`

### ❌ 7. Integración con Logging

**Necesario:**

- Usar `logLLMCall()` en las llamadas LLM
- Usar `logPhaseResult()` para guardar el resultado final
- Crear estructura de logs: `storage/llm-logs/vendor_{vendorId}/vendorDeepResearch/`

### ❌ 8. Configuración LLM Específica

**Necesario añadir a `llm.ts`:**

```typescript
vendorDeepResearchModel: string;
vendorDeepResearchReasoningEffort: ReasoningEffort;
vendorDeepResearchTimeoutMs: number;
vendorDeepResearchTemp?: number;
vendorDeepResearchTokens?: number;
```

## Plan de Implementación Sugerido

### Fase 1: Modelos y Schemas
1. Crear `VendorDeepResearchInput` y `VendorDeepResearchReport`
2. Crear schema JSON `vendorDeepResearch.json`
3. Añadir configuraciones LLM necesarias

### Fase 2: Cliente de Deep Research
1. Crear `vendorDeepResearchClient.ts` reutilizando patrón de `deepResearchClient.ts`
2. Adaptar prompts para análisis de vendor
3. Integrar web search usando `buildToolsForModel()`

### Fase 3: Servicio y Persistencia
1. Crear `VendorDeepResearchService` o extender `DeepResearchService`
2. Decidir estrategia de persistencia (tabla separada recomendada)
3. Crear migración Prisma si es necesaria
4. Integrar con sistema de cache

### Fase 4: API y Logging
1. Añadir ruta HTTP para trigger del análisis
2. Integrar logging con `llmLogger`
3. Manejo de errores y validaciones

### Fase 5: Testing y Refinamiento
1. Probar con diferentes vendors
2. Ajustar prompts según resultados
3. Optimizar timeouts y configuraciones

## Resumen de Reutilización

### ✅ Alta Reutilización (80-90%)
- Infraestructura LLM (deepResearchClient pattern)
- Utilidades (modelCapabilities, phaseLogger, llmLogger)
- Configuración LLM
- Sistema de schemas
- Sistema de cache

### ⚠️ Reutilización Parcial (50-60%)
- VendorResearchAgent (estructura, pero necesita extensión)
- DeepResearchService (patrón, pero diferente propósito)

### ❌ Nuevo (0%)
- Modelos de datos específicos para vendor deep research
- Schema JSON específico
- Prompts específicos para vendor analysis
- Persistencia específica (si usamos tabla separada)
- Ruta HTTP específica

## Conclusión

**El código existente proporciona una base sólida (80%+ reutilizable)** para implementar vendor deep research. El patrón de `deepResearchClient.ts` es especialmente valioso y puede ser adaptado directamente. La mayor parte del trabajo será:

1. **Adaptar prompts y schemas** para el contexto de vendor
2. **Crear modelos de datos** específicos
3. **Decidir estrategia de persistencia**
4. **Añadir ruta HTTP** y integración

El sistema de logging, configuración LLM, y utilidades están listas para usar sin modificaciones.

## Estado Actual (diciembre 2025)

Desde este análisis inicial se ha completado la implementación del flujo de Vendor Deep Research. Puntos clave:

- **Pipeline por fases**: el informe se genera mediante fases independientes (summary, portfolio, evidence-cases, evidence-partnerships, evidence-awards, signals-news, signals-videos y signals-social), cada una con su propio JSON schema y logging dedicado en `storage/llm-logs/vendor_<id>/vendorDeepResearch_*`.
- **LLM resiliente**: se reutiliza `buildToolsForModel` para activar web search y se añaden reintentos + fallback automático a modelos GPT‑4 cuando los GPT‑5 mini/nano no devuelven JSON estructurado.
- **Persistencia**: `VendorDeepResearchService` normaliza el reporte, sanea caracteres de control y lo guarda en la tabla específica (`vendorDeepResearchReport`) junto con el modelo utilizado.
- **Configuración**: Admin expone ajustes globales (modelo, tokens, reasoning) para Vendor Analysis, y el backend lee esos valores desde `llmConfig.vendorDeepResearch*`.
- **Frontend**: la página de vendors muestra el estado del análisis, el modelo utilizado y permite re-lanzarlo; existe un dashboard detallado (`/vendors/[id]/analysis`) que presenta cada sección del informe.

En resumen, la funcionalidad solicitada está operativa end-to-end y soporta tanto modelos GPT‑4 como GPT‑5, con métricas y logs disponibles para depuración.

