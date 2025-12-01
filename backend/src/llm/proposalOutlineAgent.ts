import OpenAI from 'openai';
import { llmConfig } from '../config/llm';
import { ClientAccount } from '../domain/models/clientAccount';
import { ServiceOffering } from '../domain/models/serviceOffering';
import {
  OpportunityRequirementsSection,
  EvidenceItem,
  ProposalOutlineLite,
} from '../domain/models/clientIntelDashboard';
import { logger } from '../lib/logger';
import { loadDashboardSchema } from './schemas';
import { logPhaseStart } from './phaseLogger';
import {
  buildToolsForModel,
  getModelCapabilities,
  requiresLegacyJsonSchemaFormat,
} from './modelCapabilities';

const proposalOutlineSchema = loadDashboardSchema('proposalOutline') as Record<
  string,
  unknown
>;

type ResponseContentChunk = {
  type: string;
  [key: string]: unknown;
};

const ensureClient = (): OpenAI => {
  if (!llmConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for ProposalOutlineAgent');
  }
  return new OpenAI({ apiKey: llmConfig.openaiApiKey });
};

const extractStructuredOutput = (
  response: OpenAI.Responses.Response,
): ProposalOutlineLite => {
  const outputItems =
    (response.output as Array<{ content?: ResponseContentChunk[] }>) ?? [];

  const jsonChunk = outputItems
    .flatMap((entry) => entry.content ?? [])
    .find((chunk) => chunk.type === 'output_json');

  if (jsonChunk && 'json' in jsonChunk && jsonChunk.json) {
    return jsonChunk.json as ProposalOutlineLite;
  }

  const fallbackText = Array.isArray(response.output_text)
    ? response.output_text.join('')
    : response.output_text;

  if (fallbackText) {
    try {
      return JSON.parse(fallbackText.trim()) as ProposalOutlineLite;
    } catch (error) {
      logger.warn(
        {
          responseId: response.id,
          parseError: error instanceof Error ? error.message : error,
          fallbackSnippet: fallbackText.slice(0, 400),
        },
        'ProposalOutlineAgent fallback JSON parse failed',
      );
    }
  }

  throw new Error('ProposalOutlineAgent: no structured output returned');
};

export class ProposalOutlineAgent {
  async generate(params: {
    client: ClientAccount;
    service: ServiceOffering;
    opportunityContext: string;
    opportunityRequirements: OpportunityRequirementsSection;
    vendorEvidence: EvidenceItem[];
    dossierSummary: string | null;
    dossierVectorStoreId?: string;
  }): Promise<ProposalOutlineLite> {
    const client = ensureClient();
    const { dossierVectorStoreId } = params;

    const systemPrompt = `Eres un consultor de propuesta senior. Debes convertir los insights estratégicos en un outline breve (máx. 4 secciones) listo para un deck o documento de 10 páginas.`;

    const userPrompt = `Contexto resumido:

CLIENTE: ${params.client.name} (${params.client.sectorHint || 'Sector no especificado'})
SERVICIO: ${params.service.name} — ${params.service.shortDescription}
OPORTUNIDAD: ${params.opportunityContext}

REQUISITOS CLAVE:
${params.opportunityRequirements.requirements
  .map((req) => `- (${req.priorityLevel ?? req.priority}) ${req.title}: ${req.description}`)
  .join('\n')}

EVIDENCIAS DISPONIBLES:
${params.vendorEvidence
  .map((ev) => `- [${ev.id}] ${ev.title}: ${ev.description ?? ev.snippet}`)
  .join('\n')}

NOTAS DEL DOSSIER:
${params.dossierSummary ?? 'Sin notas adicionales.'}

Genera un outline con secciones priorizadas. Cada sección debe incluir:
- Título claro
- Propósito / objetivo
- Bullet list de contenidos sugeridos
- Referencias a IDs de evidencias (cuando aplique)

Límites:
- Máximo 4 secciones
- Usa evidencias reales cuando existan, si no, deja el array vacío
- Mantén el contenido ejecutivo y accionable`;

    const model = llmConfig.proposalOutlineModel;
    const capabilities = getModelCapabilities(model);
    const temperature = capabilities.supportsTemperature
      ? llmConfig.temperature || capabilities.defaultTemperature
      : undefined;
    const maxOutputTokens = capabilities.supportsMaxOutputTokens
      ? llmConfig.tokenLimits.fitStrategyTokens
      : undefined;
    const allowWebSearch = llmConfig.featureToggles.webSearch;
    const allowFileSearch =
      Boolean(dossierVectorStoreId) && llmConfig.featureToggles.fileSearch;
    const { tools, toolResources, usesWebSearch, usesFileSearch } = buildToolsForModel(model, {
      allowWebSearch,
      allowFileSearch,
      vectorStoreId: dossierVectorStoreId,
    });

    logPhaseStart('proposalOutline', {
      source: 'agent' as const,
      clientId: params.client.id,
      serviceId: params.service.id,
      model,
      reasoningEffort: llmConfig.proposalOutlineReasoningEffort,
      usesWebSearch,
      usesFileSearch,
    });
    logger.info(
      {
        phase: 'proposalOutline',
        clientId: params.client.id,
        serviceId: params.service.id,
        model,
        reasoning: llmConfig.proposalOutlineReasoningEffort,
        usesWebSearch,
        usesFileSearch,
      },
      'ProposalOutlineAgent starting',
    );

    try {
      const jsonSchemaDefinition = {
        name: 'proposal_outline_lite',
        schema: proposalOutlineSchema,
      };
      const schemaFormat = {
        type: 'json_schema' as const,
        ...jsonSchemaDefinition,
      };
      const useLegacyResponseFormat = requiresLegacyJsonSchemaFormat(model);

      const requestPayload: Record<string, unknown> = {
        model,
        ...(capabilities.supportsReasoning
          ? { reasoning: { effort: llmConfig.proposalOutlineReasoningEffort } }
          : {}),
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(typeof maxOutputTokens === 'number'
          ? { max_output_tokens: maxOutputTokens }
          : {}),
        input: [
          { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
          { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
        ],
      };

      if (useLegacyResponseFormat) {
        requestPayload.response_format = {
          type: 'json_schema',
          json_schema: jsonSchemaDefinition,
        };
      } else {
        requestPayload.text = {
          format: schemaFormat,
        };
      }

      if (tools && tools.length) {
        requestPayload.tools = tools;
      }
      if (toolResources) {
        requestPayload.tool_resources = toolResources;
      }

      const response = (await client.responses.create(
        requestPayload as OpenAI.Responses.ResponseCreateParams,
      )) as OpenAI.Responses.Response;

      const outline = extractStructuredOutput(response);

      outline.sections = outline.sections.slice(0, 4).map((section, idx) => ({
        ...section,
        id: section.id || `outline_section_${idx + 1}`,
      }));

      logger.info(
        {
          clientId: params.client.id,
          serviceId: params.service.id,
          sections: outline.sections.length,
        },
        'ProposalOutlineAgent completed outline',
      );

      return outline;
    } catch (error) {
      logger.error(
        {
          clientId: params.client.id,
          serviceId: params.service.id,
          error: error instanceof Error ? error.message : error,
        },
        'ProposalOutlineAgent failed',
      );
      throw new Error(
        `Failed to generate proposal outline: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}

