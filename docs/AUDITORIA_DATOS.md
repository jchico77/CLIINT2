# Auditoría de Datos: Dummy vs Real (LLM)

## Resumen Ejecutivo

Este documento detalla qué partes del sistema usan **datos reales generados por LLM** y qué partes usan **datos dummy/fake** para pruebas.

**Estado Actual (con API Key)**:
- ✅ **8 secciones REALES** (generadas por LLM con GPT-4o)
- ⚠️ **3 secciones FAKE** (hardcoded, pendientes de implementación LLM)

**Estado Actual (sin API Key)**:
- ❌ **0 secciones REALES**
- ⚠️ **11 secciones FAKE** (todo hardcoded como fallback)

---

## 🟢 Datos REALES (Generados por LLM)

### Cuando hay API Key de OpenAI configurada:

#### ✅ Secciones Completamente Generadas por LLM:

1. **Account Snapshot** 
   - **Fuente**: `ClientResearchAgent`
   - **Modelo**: GPT-4o
   - **Datos reales**: 
     - Nombre de empresa (del input)
     - Industria (del input o inferido)
     - Descripción de la empresa (generada por LLM basándose en conocimiento público)
     - Métricas clave (generadas basándose en conocimiento del sector)
     - Empleados, ingresos (rangos o "unknown" si no hay datos públicos)
   - **Archivo**: `src/llm/clientResearchAgent.ts`

2. **Market Context**
   - **Fuente**: `ClientResearchAgent`
   - **Modelo**: GPT-4o
   - **Datos reales**:
     - Tendencias de la industria (basadas en conocimiento actual del sector)
     - Eventos recientes (basados en conocimiento público de la empresa)
     - Tamaño de mercado (si está disponible públicamente)
     - Tasa de crecimiento (si está disponible públicamente)
   - **Archivo**: `src/llm/clientResearchAgent.ts`

3. **Strategic Priorities**
   - **Fuente**: `ClientResearchAgent`
   - **Modelo**: GPT-4o
   - **Datos reales**:
     - Prioridades estratégicas (inferidas del contexto de oportunidad y conocimiento del sector)
     - Pain points (generados basándose en el sector y contexto)
     - Relevancia al servicio (calculada por LLM)
   - **Archivo**: `src/llm/clientResearchAgent.ts`

4. **Evidence Pack**
   - **Fuente**: `VendorResearchAgent`
   - **Modelo**: GPT-4o
   - **Datos reales**:
     - Evidencias del vendor (casos de estudio, KPIs, testimonios, premios)
     - Basadas en conocimiento público del vendor y su web corporativa
     - Snippets relevantes para propuestas
   - **Archivo**: `src/llm/vendorResearchAgent.ts`

---

## 🔴 Datos DUMMY/FAKE (Hardcoded)

### Solo se usan cuando NO hay API key de OpenAI configurada:

#### ⚠️ Secciones con Datos Fake (Fallback):

1. **Stakeholder Map**
   - **Fuente**: `generateStakeholderMap()` - Datos hardcoded (solo fallback)
   - **Datos fake**:
     - Stakeholders: "John Smith (CTO)", "Sarah Johnson (CFO)", "Mike Davis (VP Operations)"
     - Roles, influencia, stance: Todos valores genéricos
     - Notas y prioridades: Texto genérico
   - **Archivo**: `src/domain/services/dashboardService.ts` (líneas 239-275)
   - **Estado**: ✅ Implementado con LLM (Fase 4). Fake solo como fallback.

2. **Competitive Landscape**
   - **Fuente**: `generateCompetitiveLandscape()` - Datos hardcoded (solo fallback)
   - **Datos fake**:
     - Competidores: "Competitor A", "Alternative Vendor X", "Build in-house"
     - Descripciones genéricas
     - Fortalezas/debilidades genéricas
   - **Archivo**: `src/domain/services/dashboardService.ts` (líneas 277-313)
   - **Estado**: ✅ Implementado con LLM (Fase 4). Fake solo como fallback.

3. **Vendor Fit & Plays**
   - **Fuente**: `generateVendorFitAndPlays()` - Datos hardcoded (solo fallback)
   - **Datos fake**:
     - Overall fit: Siempre "high" con score 82
     - Dimensiones: "Technical Capability (90%)", "Business Alignment (85%)", "Cultural Fit (70%)"
     - Plays: "Efficiency Play", "Innovation Play" (genéricos)
   - **Archivo**: `src/domain/services/dashboardService.ts` (líneas 316-357)
   - **Estado**: ✅ Implementado con LLM (Fase 4). Fake solo como fallback.

4. **Gaps & Questions**
   - **Fuente**: `generateGapsAndQuestions()` - Datos hardcoded (solo fallback)
   - **Datos fake**:
     - Gaps: "Current Technology Stack", "Budget and Timeline", "Decision Process"
     - Preguntas: Genéricas como "What are the main pain points..."
   - **Archivo**: `src/domain/services/dashboardService.ts` (líneas 394-440)
   - **Estado**: ✅ Implementado con LLM (Fase 4). Fake solo como fallback.

**Nota**: Con API key configurada, estas funciones NO se usan. Solo se usan como fallback si LLM falla o no hay API key.

---

## 📝 Datos del Formulario (Frontend)

### Valores por Defecto (Dummy para pruebas rápidas):

**Ubicación**: `frontend/app/clients/new/page.tsx`

- **Vendor**: Indra Sistemas (empresa española real)
- **Cliente**: Telefónica (empresa española real)
- **Servicio**: Plataforma de Transformación Digital Empresarial
- **Contexto**: Texto pre-rellenado sobre la oportunidad

**Nota**: Estos valores son solo para facilitar pruebas. El usuario puede cambiarlos antes de generar el dashboard.

---

## 🔄 Lógica de Decisión

### Flujo de Generación:

```
┌─────────────────────────────────────┐
│ ¿Hay OPENAI_API_KEY configurada?   │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
      SÍ               NO
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Usar LLM     │  │ Usar datos fake  │
│ (generateLLM │  │ (generateFake    │
│  Sections)   │  │  Sections)        │
└──────┬───────┘  └──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ ClientResearchAgent.research()       │
│ → Account Snapshot (REAL)            │
│ → Market Context (REAL)              │
│ → Strategic Priorities (REAL)         │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ VendorResearchAgent.research()       │
│ → Evidence Pack (REAL)               │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ FitAndStrategyAgent.generate()       │
│ → Stakeholder Map (REAL)              │
│ → Competitive Landscape (REAL)       │
│ → Vendor Fit & Plays (REAL)          │
│ → Gaps & Questions (REAL)             │
└─────────────────────────────────────┘
```

---

## 📊 Tabla Resumen por Sección

| Sección | Fuente | Tipo | Modelo LLM | Estado |
|---------|--------|------|------------|--------|
| **Account Snapshot** | ClientResearchAgent | ✅ REAL | GPT-4o | ✅ Implementado |
| **Market Context** | ClientResearchAgent | ✅ REAL | GPT-4o | ✅ Implementado |
| **Strategic Priorities** | ClientResearchAgent | ✅ REAL | GPT-4o | ✅ Implementado |
| **Stakeholder Map** | FitAndStrategyAgent | ✅ REAL | GPT-4o | ✅ Fase 4 |
| **Competitive Landscape** | FitAndStrategyAgent | ✅ REAL | GPT-4o | ✅ Fase 4 |
| **Vendor Fit & Plays** | FitAndStrategyAgent | ✅ REAL | GPT-4o | ✅ Fase 4 |
| **Evidence Pack** | VendorResearchAgent | ✅ REAL | GPT-4o | ✅ Implementado |
| **Gaps & Questions** | FitAndStrategyAgent | ✅ REAL | GPT-4o | ✅ Fase 4 |

**Resumen**: 8 de 8 secciones usan LLM (100%) cuando hay API key configurada. Sin API key: 0 de 8 (todo fake).

---

## 🔍 Detalles Técnicos

### Archivos Clave:

1. **`src/domain/services/dashboardService.ts`**
   - `generateDashboard()`: Método principal que decide usar LLM o fake
   - `generateLLMSections()`: Combina datos LLM + fake
   - `generateFakeSections()`: Genera todo con datos fake
   - `generateStakeholderMap()`: Datos fake hardcoded
   - `generateCompetitiveLandscape()`: Datos fake hardcoded
   - `generateVendorFitAndPlays()`: Datos fake hardcoded
   - `generateGapsAndQuestions()`: Datos fake hardcoded

2. **`src/llm/clientResearchAgent.ts`**
   - Genera: Account Snapshot, Market Context, Strategic Priorities
   - Usa conocimiento público y contexto de oportunidad

3. **`src/llm/vendorResearchAgent.ts`**
   - Genera: Evidence Pack
   - Analiza vendor y servicio específico

### Indicadores en el Dashboard:

- **Campo `llmModelUsed`**: 
  - `"gpt-4o"` = Se usó LLM (al menos parcialmente)
  - `"fake-data-generator"` = Todo es fake

---

## ✅ Fase 4 Completada

Todas las secciones ahora se generan con LLM cuando hay API key:

1. **Stakeholder Map**: ✅ Implementado con FitAndStrategyAgent
   - Genera stakeholders realistas basados en sector y tamaño de empresa
   - Roles, influencia y stance contextualizados
   - Prioridades específicas por stakeholder

2. **Competitive Landscape**: ✅ Implementado con FitAndStrategyAgent
   - Competidores reales del cliente y vendor
   - Análisis de fortalezas/debilidades
   - Alternativas en el mercado

3. **Vendor Fit & Plays**: ✅ Implementado con FitAndStrategyAgent
   - Análisis de encaje real entre vendor y cliente
   - Plays estratégicos personalizados y accionables
   - Fit score calculado basado en análisis

4. **Gaps & Questions**: ✅ Implementado con FitAndStrategyAgent
   - Gaps identificados basados en análisis completo
   - Preguntas inteligentes y contextualizadas
   - Target stakeholders específicos

---

## 📝 Notas Importantes

- **Los datos LLM son reales** pero basados en conocimiento público del modelo
- **No se hace web scraping** - todo es conocimiento del LLM
- **Los datos fake son consistentes** - siempre los mismos valores para facilitar pruebas
- **Fallback automático**: Si LLM falla, se usa fake automáticamente
- **Sin API key**: Todo el dashboard es fake (modo demo)
- **Formulario**: Valores por defecto son dummy pero representan empresas reales (Indra, Telefónica)

---

## 🔐 Configuración

Para usar datos reales:
```powershell
# Configurar API key
$env:OPENAI_API_KEY="tu-api-key"

# O usar el script
cd CLIINT2/backend
.\setup-env.ps1
```

Sin API key, todo será fake automáticamente.
