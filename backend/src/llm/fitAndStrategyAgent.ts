import OpenAI from 'openai';
import {
  StakeholderMapSection,
  CompetitiveLandscapeSection,
  VendorFitAndPlaysSection,
  GapsAndQuestionsSection,
  AccountSnapshotSection,
  MarketContextSection,
  OpportunityRequirementsSection,
  EvidenceItem,
} from '../domain/models/clientIntelDashboard';
import { Vendor } from '../domain/models/vendor';
import { ClientAccount } from '../domain/models/clientAccount';
import { ServiceOffering } from '../domain/models/serviceOffering';
import { llmConfig } from '../config/llm';
import { logger } from '../lib/logger';
import { loadDashboardSchema } from './schemas';
import { logPhaseStart } from './phaseLogger';

type ResponseTool = NonNullable<OpenAI.Responses.ResponseCreateParams['tools']>[number];

export interface FitAndStrategyOutput {
  stakeholderMap: StakeholderMapSection;
  competitiveLandscape: CompetitiveLandscapeSection;
  vendorFitAndPlays: VendorFitAndPlaysSection;
  gapsAndQuestions: GapsAndQuestionsSection;
}

type FitAndStrategyStructuredOutput = {
  stakeholderMap: StakeholderMapSection;
  competitiveLandscape: CompetitiveLandscapeSection;
  vendorFitAndPlays: VendorFitAndPlaysSection;
  gapsAndQuestions: GapsAndQuestionsSection;
};

const schemaParts = {
  stakeholderMap: loadDashboardSchema('stakeholderMap') as Record<string, unknown>,
  competitiveLandscape: loadDashboardSchema('competitiveLandscape') as Record<string, unknown>,
  vendorFitAndPlays: loadDashboardSchema('vendorFitAndPlays') as Record<string, unknown>,
  gapsAndQuestions: loadDashboardSchema('gapsAndQuestions') as Record<string, unknown>,
};

const fitAndStrategySchema = {
  name: 'fit_and_strategy_output',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['stakeholderMap', 'competitiveLandscape', 'vendorFitAndPlays', 'gapsAndQuestions'],
    properties: schemaParts,
  },
};

const ensureOpenAIClient = (): OpenAI => {
  if (!llmConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for FitAndStrategyAgent');
  }
  return new OpenAI({ apiKey: llmConfig.openaiApiKey });
};

const extractStructuredOutput = (
  response: OpenAI.Responses.Response,
): FitAndStrategyStructuredOutput => {
  const outputItems =
    (response.output as Array<{ content?: Array<{ type: string; [key: string]: unknown }> }>) ??
    [];

  const jsonChunk = outputItems
    .flatMap((entry) => entry.content ?? [])
    .find((chunk) => chunk.type === 'output_json');

  if (jsonChunk && 'json' in jsonChunk && jsonChunk.json) {
    return jsonChunk.json as FitAndStrategyStructuredOutput;
  }

  const fallbackText = Array.isArray(response.output_text)
    ? response.output_text.join('')
    : response.output_text;
  if (fallbackText) {
    return JSON.parse(fallbackText.trim()) as FitAndStrategyStructuredOutput;
  }

  throw new Error('FitAndStrategyAgent: no structured output returned');
};

export class FitAndStrategyAgent {
  async generate(
    vendor: Vendor,
    client: ClientAccount,
    service: ServiceOffering,
    opportunityContext: string,
    clientResearch: {
      accountSnapshot: AccountSnapshotSection;
      marketContext: MarketContextSection;
      opportunityRequirements: OpportunityRequirementsSection;
    },
    vendorEvidence: EvidenceItem[],
    dossierVectorStoreId?: string,
  ): Promise<FitAndStrategyOutput> {
    const openai = ensureOpenAIClient();
    const usesWebSearch = llmConfig.featureToggles.webSearch;
    const allowFileSearch =
      Boolean(dossierVectorStoreId) && llmConfig.featureToggles.fileSearch;
    logPhaseStart('fitStrategy', {
      source: 'agent' as const,
      vendorId: vendor.id,
      clientId: client.id,
      serviceId: service.id,
      model: llmConfig.fitStrategyModel,
      reasoningEffort: llmConfig.fitStrategyReasoningEffort,
      usesWebSearch,
      usesFileSearch: allowFileSearch,
    });

    const systemPrompt = `Eres un estratega de ventas B2B experto con acceso a información en tiempo real. 
Tu objetivo es analizar el encaje entre un vendor (proveedor) y un cliente, y generar:

1. Stakeholder Map: Stakeholders clave del cliente con influencia, stance y prioridades
2. Competitive Landscape: Competidores del cliente, competidores del vendor, y alternativas
3. Vendor Fit & Plays: Análisis de encaje, dimensiones de fit, y plays estratégicos recomendados
4. Gaps & Questions: Gaps de información críticos y preguntas inteligentes para el cliente

IMPORTANTE:
- Usa investigación profunda de competidores cuando esté disponible
- Si necesitas información adicional, usa búsqueda web para obtener datos actualizados
- Basa tus análisis en información real y específica, no genérica
- Los plays deben ser accionables, estratégicos y relevantes
- Las preguntas deben ser inteligentes, contextualizadas y basadas en insights reales
- Limita stakeholders a máx. 8, competidores/alternativas a 4, plays a 4, gaps a 5 y preguntas a 6.
- Marca gaps/preguntas críticas: cada gap lleva priorityLevel ("must" | "should" | "nice") y cada pregunta "isCritical" true/false.
- Responde SIEMPRE en formato JSON válido`;

    const userPrompt = `Analiza el encaje estratégico entre vendor y cliente:

**VENDOR:**
- Nombre: ${vendor.name}
- Website: ${vendor.websiteUrl}
- Descripción: ${vendor.description || 'No disponible'}

**CLIENTE:**
- Nombre: ${client.name}
- Website: ${client.websiteUrl}
- País: ${client.country || 'No especificado'}
- Sector: ${client.sectorHint || 'No especificado'}
- Industria: ${clientResearch.accountSnapshot.industry}
- Descripción: ${clientResearch.accountSnapshot.description}

**SERVICIO:**
- Nombre: ${service.name}
- Descripción: ${service.shortDescription}
- Categorías: ${service.categoryTags.join(', ')}

**CONTEXTO DE OPORTUNIDAD:**
${opportunityContext}

**REQUISITOS / PRIORIDADES DEL CLIENTE:**
${(clientResearch.opportunityRequirements.requirements || [])
  .map(
    (req) =>
      `- (${req.priority.toUpperCase()}) ${req.title}: ${req.description} [Relevancia ${req.relevanceToService}/100]`,
  )
  .join('\n') || 'No se han identificado requisitos prioritarios en el reporte.'}

**EVIDENCIAS DEL VENDOR:**
${vendorEvidence.map(e => `- ${e.title}: ${e.snippet}`).join('\n')}

**INSTRUCCIONES:**
1. Usa web_search para encontrar competidores y stakeholders reales si no tienes información suficiente.
2. Identifica stakeholders con nombre/rol realista en el mercado del cliente.
3. Genera plays estratégicos accionables (con target stakeholder y factores de éxito).
4. Preguntas y gaps deben ser concretos y accionables.

Genera un análisis estratégico completo con la siguiente estructura JSON:

{
  "stakeholderMap": {
    "stakeholders": [
      {
        "id": "stakeholder_1",
        "name": "string (nombre realista basado en el sector)",
        "role": "string (ej: 'CTO', 'CFO', 'Director de Transformación Digital')",
        "department": "string o null",
        "influence": "high" | "medium" | "low",
        "stance": "champion" | "supporter" | "neutral" | "skeptic" | "blocker",
        "notes": "string (observaciones relevantes)",
        "priorities": ["string"] (prioridades de este stakeholder)
      }
    ],
    "summary": "string"
  },
  "competitiveLandscape": {
    "clientCompetitors": [
      {
        "id": "comp_1",
        "name": "string (competidor real del cliente)",
        "type": "client_competitor",
        "description": "string",
        "strengths": ["string"],
        "weaknesses": ["string"]
      }
    ],
    "vendorCompetitors": [
      {
        "id": "comp_2",
        "name": "string (competidor real del vendor)",
        "type": "vendor_competitor",
        "description": "string",
        "strengths": ["string"],
        "weaknesses": ["string"]
      }
    ],
    "alternatives": [
      {
        "id": "alt_1",
        "name": "string (alternativa como 'Build in-house', 'No hacer nada', etc.)",
        "type": "alternative_solution",
        "description": "string"
      }
    ],
    "summary": "string"
  },
  "vendorFitAndPlays": {
    "overallFit": "high" | "medium" | "low",
    "fitScore": 0-100,
    "fitDimensions": [
      {
        "dimension": "string (ej: 'Technical Capability', 'Business Alignment', 'Cultural Fit')",
        "score": 0-100,
        "reasoning": "string (explicación del score)"
      }
    ],
    "recommendedPlays": [
      {
        "id": "play_1",
        "name": "string (nombre del play estratégico)",
        "description": "string",
        "rationale": "string (por qué este play funciona)",
        "targetStakeholders": ["stakeholder_1", "stakeholder_2"],
        "successFactors": ["string"] (factores clave para el éxito)
      }
    ],
    "summary": "string"
  },
  "gapsAndQuestions": {
    "gaps": [
      {
        "id": "gap_1",
        "topic": "string (tema del gap)",
        "impact": "high" | "medium" | "low",
        "description": "string (qué información falta y por qué es importante)",
        "priorityLevel": "must" | "should" | "nice"
      }
    ],
    "questions": [
      {
        "id": "question_1",
        "question": "string (pregunta inteligente y específica)",
        "context": "string (por qué esta pregunta es importante)",
        "targetStakeholder": "string o null (stakeholder específico si aplica)",
        "isCritical": true | false
      }
    ],
    "summary": "string"
  }
}`;

    const tools: OpenAI.Responses.ResponseCreateParams['tools'] = [];
    if (usesWebSearch) {
      tools.push({ type: 'web_search' });
    }
    if (allowFileSearch && dossierVectorStoreId) {
      tools.push({ type: 'file_search' } as ResponseTool);
    }

    const toolResources = allowFileSearch && dossierVectorStoreId
      ? { file_search: { vector_store_ids: [dossierVectorStoreId] } }
      : undefined;

    try {
      logger.info(
        { vendorId: vendor.id, clientId: client.id, serviceId: service.id },
        'FitAndStrategyAgent generating analysis',
      );

      const requestPayload = {
        model: llmConfig.fitStrategyModel,
        reasoning: { effort: llmConfig.fitStrategyReasoningEffort },
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: fitAndStrategySchema.name,
            schema: fitAndStrategySchema.schema,
          },
        },
      } as Record<string, unknown>;

      if (tools.length) {
        requestPayload.tools = tools;
      }
      if (toolResources) {
        requestPayload.tool_resources = toolResources;
      }

      const response = (await openai.responses.create(
        requestPayload as OpenAI.Responses.ResponseCreateParams,
      )) as OpenAI.Responses.Response;

      const structured = extractStructuredOutput(response);
      logger.info(
        { vendorId: vendor.id, clientId: client.id, responseId: response.id },
        'FitAndStrategyAgent completed analysis',
      );

      return structured;
    } catch (error) {
      logger.error(
        {
          vendorId: vendor.id,
          clientId: client.id,
          error: error instanceof Error ? error.message : error,
        },
        'FitAndStrategyAgent failed',
      );
      throw new Error(
        `Failed to generate fit and strategy: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}

