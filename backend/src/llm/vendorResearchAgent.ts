import OpenAI from 'openai';
import { Vendor } from '../domain/models/vendor';
import { ServiceOffering } from '../domain/models/serviceOffering';
import { EvidenceItem } from '../domain/models/clientIntelDashboard';
import { llmConfig } from '../config/llm';
import { logger } from '../lib/logger';
import { loadDashboardSchema } from './schemas';
import { logPhaseStart } from './phaseLogger';
import { buildToolsForModel, getModelCapabilities } from './modelCapabilities';

export interface VendorResearchOutput {
  serviceOfferings: Array<{
    name: string;
    description: string;
    categoryTags: string[];
  }>;
  differentiators: Array<{
    claim: string;
    evidence: string;
  }>;
  evidence: EvidenceItem[];
}

type VendorResearchStructuredOutput = {
  serviceOfferings: VendorResearchOutput['serviceOfferings'];
  differentiators: VendorResearchOutput['differentiators'];
  evidencePack: {
    items: EvidenceItem[];
    summary: string;
  };
};

const evidencePackSchema = loadDashboardSchema('evidencePack') as Record<
  string,
  unknown
>;

const vendorResearchSchema = {
  name: 'vendor_research_output',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['serviceOfferings', 'differentiators', 'evidencePack'],
    properties: {
      serviceOfferings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'description', 'categoryTags'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            categoryTags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      differentiators: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['claim', 'evidence'],
          properties: {
            claim: { type: 'string' },
            evidence: { type: 'string' },
          },
        },
      },
      evidencePack: evidencePackSchema,
    },
  },
};

const ensureOpenAIClient = (): OpenAI => {
  if (!llmConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for VendorResearchAgent');
  }
  return new OpenAI({ apiKey: llmConfig.openaiApiKey });
};

const extractStructuredOutput = (
  response: OpenAI.Responses.Response,
): VendorResearchStructuredOutput => {
  const outputItems =
    (response.output as Array<{ content?: Array<{ type: string; [key: string]: unknown }> }>) ??
    [];

  const jsonChunk = outputItems
    .flatMap((entry) => entry.content ?? [])
    .find((chunk) => chunk.type === 'output_json');

  if (jsonChunk && 'json' in jsonChunk && jsonChunk.json) {
    return jsonChunk.json as VendorResearchStructuredOutput;
  }

  const fallbackText = Array.isArray(response.output_text)
    ? response.output_text.join('')
    : response.output_text;
  if (fallbackText) {
    return JSON.parse(fallbackText.trim()) as VendorResearchStructuredOutput;
  }

  throw new Error('VendorResearchAgent: no structured output returned');
};

export class VendorResearchAgent {
  async research(vendor: Vendor, service: ServiceOffering): Promise<VendorResearchOutput> {
    const openai = ensureOpenAIClient();

    const systemPrompt = `Eres un analista de vendor B2B. Necesitamos:
1) Resumen claro de servicios/productos del vendor.
2) Diferenciadores respaldados por evidencia.
3) Evidencias accionables (casos, KPIs, premios) listas para propuestas.
Responde en JSON conforme al schema proporcionado.`;

    const userPrompt = `Analiza el vendor y servicio objetivo:

VENDOR
- Nombre: ${vendor.name}
- Website: ${vendor.websiteUrl}
- Descripción: ${vendor.description || 'No disponible'}

SERVICIO FOCO
- Nombre: ${service.name}
- Descripción: ${service.shortDescription}
- Categorías: ${service.categoryTags.join(', ')}

Genera serviceOfferings, differentiators y un evidencePack con items relevantes. 
Si no hay evidencias específicas disponibles, crea ejemplos plausibles para este tipo de servicio basados en mejores prácticas del sector.`;

    const model = llmConfig.vendorResearchModel;
    const capabilities = getModelCapabilities(model);
    const temperature = capabilities.supportsTemperature
      ? llmConfig.temperatureOverrides.vendorResearchTemp ?? capabilities.defaultTemperature
      : undefined;
    const maxOutputTokens = capabilities.supportsMaxOutputTokens
      ? llmConfig.tokenLimits.vendorResearchTokens
      : undefined;
    const canUseFileSearch =
      Boolean(llmConfig.vendorEvidenceVectorStoreId) && llmConfig.featureToggles.fileSearch;
    const { tools, toolResources, usesFileSearch } = buildToolsForModel(model, {
      allowWebSearch: false,
      allowFileSearch: canUseFileSearch,
      vectorStoreId: llmConfig.vendorEvidenceVectorStoreId,
    });

    try {
      logPhaseStart('vendorResearch', {
        source: 'agent' as const,
        vendorId: vendor.id,
        serviceId: service.id,
        model,
        reasoningEffort: llmConfig.vendorResearchReasoningEffort,
        usesWebSearch: false,
        usesFileSearch,
      });
      logger.info(
        { vendorId: vendor.id, serviceId: service.id },
        'VendorResearchAgent starting analysis',
      );

      const requestPayload = {
        model,
        ...(capabilities.supportsReasoning
          ? { reasoning: { effort: llmConfig.vendorResearchReasoningEffort } }
          : {}),
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(typeof maxOutputTokens === 'number'
          ? { max_output_tokens: maxOutputTokens }
          : {}),
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
            name: vendorResearchSchema.name,
            schema: vendorResearchSchema.schema,
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

      const structured = extractStructuredOutput(response);
      logger.info(
        {
          vendorId: vendor.id,
          serviceId: service.id,
          responseId: response.id,
          evidenceItems: structured.evidencePack.items.length,
        },
        'VendorResearchAgent completed analysis',
      );

      return {
        serviceOfferings: structured.serviceOfferings,
        differentiators: structured.differentiators,
        evidence: structured.evidencePack.items,
      };
    } catch (error) {
      logger.error(
        {
          vendorId: vendor.id,
          serviceId: service.id,
          error: error instanceof Error ? error.message : error,
        },
        'VendorResearchAgent failed',
      );
      throw new Error(
        `Failed to research vendor: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}

