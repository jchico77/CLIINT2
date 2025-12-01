# Sistema de Logging de LLM

Este documento describe el sistema de logging implementado para capturar todas las llamadas al LLM y los resultados de cada fase del análisis de oportunidades.

## Estructura de Archivos

Los logs se guardan en la siguiente estructura:

```
storage/
└── llm-logs/
    └── {opportunityId}/
        ├── deepResearch/
        │   ├── llm-calls.log       # Todas las llamadas LLM (una por línea JSON)
        │   └── phase-result.json   # Resultado final procesado de la fase
        ├── clientResearch/
        │   ├── llm-calls.log
        │   └── phase-result.json
        ├── vendorResearch/
        │   ├── llm-calls.log
        │   └── phase-result.json
        ├── fitStrategy/
        │   ├── llm-calls.log
        │   └── phase-result.json
        └── proposalOutline/
            ├── llm-calls.log
            └── phase-result.json
```

## Formato de los Logs

### LLM Calls Log (`llm-calls.log`)

Cada línea del archivo es un objeto JSON con la siguiente estructura:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "opportunityId": "opp_123",
  "phase": "clientResearch",
  "callIndex": 1,
  "model": "gpt-4o",
  "systemPrompt": "Eres un analista...",
  "userPrompt": "Analiza el cliente...",
  "options": {
    "temperature": 0.7,
    "maxTokens": 4000,
    "responseFormat": { "type": "json_object" }
  },
  "response": "{\"accountSnapshot\": {...}}",
  "responseTimeMs": 3421,
  "metadata": {
    "vendorId": "vendor_123",
    "clientId": "client_456"
  }
}
```

### Phase Result (`phase-result.json`)

Resultado final procesado de cada fase:

```json
{
  "timestamp": "2024-01-15T10:35:00.000Z",
  "opportunityId": "opp_123",
  "phase": "clientResearch",
  "result": {
    "accountSnapshot": {...},
    "marketContext": {...},
    "opportunityRequirements": {...}
  },
  "metadata": {
    "vendorId": "vendor_123",
    "clientId": "client_456",
    "serviceId": "service_789"
  }
}
```

## Fases Registradas

1. **deepResearch**: Investigación profunda del cliente usando web search
2. **clientResearch**: Análisis del cliente (AccountSnapshot, MarketContext, StrategicPriorities)
3. **vendorResearch**: Extracción de evidencias del vendor
4. **fitStrategy**: Análisis de fit y estrategia (StakeholderMap, CompetitiveLandscape, etc.)
5. **proposalOutline**: Generación del outline de la propuesta

## Implementación

### Logging Automático

El sistema captura automáticamente:

1. **Resultados de fases**: Se guardan automáticamente cuando se completa cada fase en `DashboardService`
2. **Llamadas a través de LLMClient**: Todas las llamadas que pasan por `LLMClient.generate()` o `LLMClient.generateJSON()` se loguean automáticamente

### Logging Manual

Para llamadas directas a OpenAI (por ejemplo, en agentes que usan el cliente OpenAI directamente), puedes usar el helper:

```typescript
import { logOpenAICall } from '../utils/llmCallLogger';

const result = await logOpenAICall(
  () => openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [...]
  }),
  {
    opportunityId: 'opp_123',
    phase: 'clientResearch',
    model: 'gpt-4o',
    systemPrompt: '...',
    userPrompt: '...',
    metadata: { vendorId: 'vendor_123' }
  }
);
```

## Uso

Los logs se generan automáticamente cuando se crea un dashboard para una oportunidad. No se requiere configuración adicional.

### Ver los Logs

Los logs se guardan en `backend/storage/llm-logs/{opportunityId}/`.

Para ver las llamadas LLM de una fase:

```bash
# Ver todas las llamadas LLM de una fase
cat backend/storage/llm-logs/opp_123/clientResearch/llm-calls.log | jq

# Ver el resultado final de una fase
cat backend/storage/llm-logs/opp_123/clientResearch/phase-result.json | jq
```

### Análisis de los Logs

Cada llamada LLM incluye:
- Los prompts completos (system + user)
- La respuesta completa del LLM
- El tiempo de ejecución
- El modelo usado y sus opciones
- Metadatos del contexto

Los resultados de fase incluyen:
- El resultado completo procesado
- Metadatos de la fase
- Timestamp de cuando se completó

## Próximos Pasos

Para capturar todas las llamadas LLM automáticamente (incluyendo las que se hacen directamente con OpenAI), sería necesario:

1. Modificar los agentes para que acepten `opportunityId` y `phase` como parámetros
2. Usar el helper `logOpenAICall` o pasar estos parámetros a través de la cadena de llamadas
3. Integrar el logging en `deepResearchClient`, `ClientResearchAgent`, `VendorResearchAgent`, etc.

Por ahora, el sistema captura:
- ✅ Resultados finales de todas las fases
- ✅ Llamadas que pasan por `LLMClient`
- ⚠️ Llamadas directas a OpenAI (requiere integración manual en los agentes)

