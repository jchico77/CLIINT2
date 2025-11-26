import OpenAI from 'openai';
import { llmConfig } from '../config/llm';
import {
  AccountSnapshotSection,
  MarketContextSection,
  OpportunityRequirementsSection,
} from '../domain/models/clientIntelDashboard';
import { ClientAccount } from '../domain/models/clientAccount';
import { ServiceOffering } from '../domain/models/serviceOffering';
import { ClientDeepResearchReport } from '../domain/models/clientDeepResearchReport';
import { logger } from '../lib/logger';
import {
  DashboardSchemaName,
  loadDashboardSchema,
} from './schemas';
import { logPhaseStart } from './phaseLogger';

interface ClientResearchOutput {
  accountSnapshot: AccountSnapshotSection;
  marketContext: MarketContextSection;
  opportunityRequirements: OpportunityRequirementsSection;
}

const ensureOpenAIClient = (): OpenAI => {
  if (!llmConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for ClientResearchAgent');
  }
  return new OpenAI({ apiKey: llmConfig.openaiApiKey });
};

const stripSchemaMetadata = (schema: Record<string, unknown>) => {
  const { $schema, title, ...rest } = schema;
  return rest;
};

const sectionSchema = (name: DashboardSchemaName) =>
  stripSchemaMetadata(loadDashboardSchema(name) as Record<string, unknown>);

const clientResearchResponseSchema = {
  name: 'client_research_sections',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['accountSnapshot', 'marketContext', 'opportunityRequirements'],
    properties: {
      accountSnapshot: sectionSchema('accountSnapshot'),
      marketContext: sectionSchema('marketContext'),
      opportunityRequirements: sectionSchema('opportunityRequirements'),
    },
  },
};

type ResponseContentChunk = {
  type: string;
  [key: string]: unknown;
};

const extractStructuredOutput = (
  response: OpenAI.Responses.Response,
): ClientResearchOutput => {
  const outputItems =
    (response.output as Array<{ content?: ResponseContentChunk[] }>) ?? [];

  const jsonChunk = outputItems
    .flatMap((entry) => entry.content ?? [])
    .find((chunk) => chunk.type === 'output_json');

  if (jsonChunk && 'json' in jsonChunk && jsonChunk.json) {
    return jsonChunk.json as ClientResearchOutput;
  }

  const outputText = Array.isArray(response.output_text)
    ? response.output_text.join('')
    : response.output_text;

  if (outputText) {
    return JSON.parse(outputText.trim()) as ClientResearchOutput;
  }

  throw new Error('ClientResearchAgent: no structured output returned');
};

export class ClientResearchAgent {
  async research(
    client: ClientAccount,
    service: ServiceOffering,
    opportunityContext: string,
    deepResearchReport: ClientDeepResearchReport,
    dossierSummary: string | null,
    dossierVectorStoreId?: string,
  ): Promise<ClientResearchOutput> {
    const openai = ensureOpenAIClient();
    logger.info(
      { clientId: client.id, serviceOfferingId: service.id },
      'ClientResearchAgent synthesising deep research report',
    );
    const phaseContext = {
      source: 'agent' as const,
      clientId: client.id,
      serviceId: service.id,
      model: llmConfig.clientResearchModel,
      reasoningEffort: llmConfig.clientResearchReasoningEffort,
      usesWebSearch: false,
      usesFileSearch: Boolean(dossierVectorStoreId) && llmConfig.featureToggles.fileSearch,
    };
    logPhaseStart('clientResearch', phaseContext);

    const systemPrompt = `Eres un analista de negocio B2B experto. Recibes un ClientDeepResearchReport ya estructurado y debes transformarlo en insights accionables:
1. Account Snapshot
2. Market Context
3. Strategic Priorities

IMPORTANTE:
- Usa el JSON proporcionado como fuente principal.
- Si falta un dato, marca "unknown" o deja claro que no aparece en el reporte.
- Limita: máximo 4 requisitos, 3 elementos en "whatClientSeeks/scope/exclusions" y 4 criterios.
- Cada requisito debe incluir priorityLevel ("must" | "should" | "nice") acorde a su prioridad.
- Responde SIEMPRE con JSON válido en el formato solicitado.`;

const reportPayload = JSON.stringify(deepResearchReport, null, 2);

    const userPrompt = `Dispones del siguiente ClientDeepResearchReport (JSON):
${reportPayload}

Servicio a posicionar: ${service.name} — ${service.shortDescription}
Categorías: ${service.categoryTags.join(', ') || 'N/A'}

Cliente:
- Nombre: ${client.name}
- Website: ${client.websiteUrl}
- País: ${client.country || 'No especificado'}
- Sector: ${client.sectorHint || 'No especificado'}
- Notas internas: ${client.notes || 'Ninguna'}

Contexto de oportunidad:
${opportunityContext}

Notas del dossier:
${dossierSummary ?? 'No hay notas adicionales.'}

Transforma la información en el siguiente esquema:
{
  "accountSnapshot": {
    "companyName": "string",
    "industry": "string",
    "headquarters": "string o null",
    "employeeCount": "string (ej: '1,000-5,000' o 'unknown')",
    "revenue": "string (ej: '€50M - €200M' o 'unknown')",
    "description": "string (2-3 párrafos)",
    "keyMetrics": [
      {"label": "string", "value": "string"}
    ]
  },
  "marketContext": {
    "industryTrends": [
      {"trend": "string", "impact": "high|medium|low", "description": "string"}
    ],
    "recentEvents": [
      {"date": "YYYY-MM-DD", "event": "string", "significance": "string"}
    ],
    "marketSize": "string o null",
    "growthRate": "string o null"
  },
  "strategicPriorities": {
    "priorities": [
      {
        "id": "priority_1",
        "name": "string",
        "description": "string",
        "relevanceToService": 0-100,
        "priorityLevel": "must" | "should" | "nice",
        "painPoints": [
          {"id": "pain_1", "description": "string", "severity": "high|medium|low"}
        ]
      }
    ],
    "summary": "string"
  }
}`;

    try {
      const allowFileSearch =
        Boolean(dossierVectorStoreId) && llmConfig.featureToggles.fileSearch;
      const tools = allowFileSearch
        ? ([{ type: 'file_search' }] as OpenAI.Responses.ResponseCreateParams['tools'])
        : undefined;
      const toolResources = allowFileSearch && dossierVectorStoreId
        ? { file_search: { vector_store_ids: [dossierVectorStoreId] } }
        : undefined;

      const requestPayload = {
        model: llmConfig.clientResearchModel,
        reasoning: { effort: llmConfig.clientResearchReasoningEffort },
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
            name: clientResearchResponseSchema.name,
            schema: clientResearchResponseSchema.schema,
          },
        },
      } as Record<string, unknown>;

      if (tools) {
        requestPayload.tools = tools;
      }
      if (toolResources) {
        requestPayload.tool_resources = toolResources;
      }

      const response = (await openai.responses.create(
        requestPayload as OpenAI.Responses.ResponseCreateParams,
      )) as OpenAI.Responses.Response;

      const result = extractStructuredOutput(response);

      logger.info(
        {
          clientId: client.id,
          serviceOfferingId: service.id,
          responseId: response.id,
        },
        'ClientResearchAgent completed synthesis',
      );
      return result;
    } catch (error) {
      logger.error(
        {
          clientId: client.id,
          serviceOfferingId: service.id,
          error: error instanceof Error ? error.message : error,
        },
        'ClientResearchAgent failed to synthesise report',
      );
      throw new Error(
        `Failed to research client: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}

