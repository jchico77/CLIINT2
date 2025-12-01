import OpenAI from 'openai';
import { llmConfig } from '../config/llm';
import {
  ClientDeepResearchInput,
  ClientDeepResearchReport,
} from '../domain/models/clientDeepResearchReport';
import { LLMError } from '../domain/errors/AppError';
import { logger } from '../lib/logger';
import { logPhaseStart } from './phaseLogger';
import {
  buildToolsForModel,
  getModelCapabilities,
  requiresLegacyJsonSchemaFormat,
} from './modelCapabilities';

const openai = new OpenAI({
  apiKey: llmConfig.openaiApiKey,
});

type ReasoningEffort = 'low' | 'medium' | 'high';

const HEARTBEAT_INTERVAL_MS = 30_000;

const reportSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    clientName: { type: 'string' },
    summary: { type: 'string' },
    businessModel: { type: 'string' },
    marketSegments: { type: 'array', items: { type: 'string' } },
    strategicThemes: { type: 'array', items: { type: 'string' } },
    keyRisks: { type: 'array', items: { type: 'string' } },
    macroTrends: { type: 'array', items: { type: 'string' } },
    competitors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'relevance'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    opportunities: { type: 'array', items: { type: 'string' } },
    recommendedAngles: { type: 'array', items: { type: 'string' } },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'snippet', 'url'],
        properties: {
          title: { type: 'string' },
          snippet: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
  },
  required: [
    'clientName',
    'summary',
    'businessModel',
    'marketSegments',
    'strategicThemes',
    'keyRisks',
    'macroTrends',
    'competitors',
    'opportunities',
    'recommendedAngles',
    'sources',
  ],
} as const;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error('DEEP_RESEARCH_TIMEOUT'));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

export interface RunClientDeepResearchOptions {
  model?: string;
  timeoutMs?: number;
  reasoningEffort?: ReasoningEffort;
}

const buildPrompt = (input: ClientDeepResearchInput): string =>
  `
Actúa como analista B2B senior. Investiga con web search a "${input.clientName}" y genera un informe estructurado que cubra modelo de negocio, segmentos, temas estratégicos, riesgos, macro tendencias, competidores, oportunidades, ángulos recomendados y fuentes citadas. 
Contexto del servicio que queremos posicionar: ${input.serviceOfferingName}. 
País: ${input.country ?? 'desconocido'}; sector: ${input.sectorHint ?? 'desconocido'}; website: ${
    input.clientWebsiteUrl ?? 'desconocido'
  }.
`.trim();

const extractStructuredJson = (
  response: OpenAI.Responses.Response,
): unknown => {
  const outputItems =
    (response.output as Array<{ content?: Array<{ type: string; [key: string]: unknown }> }>) ?? [];
  const jsonChunk = outputItems
    .flatMap((entry) => entry.content ?? [])
    .find((chunk) => chunk.type === 'output_json');

  if (jsonChunk && typeof jsonChunk.json !== 'undefined') {
    return jsonChunk.json;
  }

  const fallbackText = Array.isArray(response.output_text)
    ? response.output_text.join('')
    : response.output_text;
  if (fallbackText) {
    try {
      return JSON.parse(fallbackText.trim());
    } catch (error) {
      throw new LLMError(
        `Failed to parse Deep Research JSON output: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return null;
};

const formatApiError = (error: unknown): Record<string, unknown> | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  ) {
    return {
      status: (error as { status?: number }).status,
      message: (error as { message?: string }).message,
      type: (error as { type?: string }).type,
      code: (error as { code?: string }).code,
    };
  }
  return undefined;
};

export async function runClientDeepResearch(
  input: ClientDeepResearchInput,
  options: RunClientDeepResearchOptions = {},
): Promise<ClientDeepResearchReport> {
  if (!llmConfig.openaiApiKey) {
    throw new LLMError('OPENAI_API_KEY is required to use Deep Research');
  }

  const model = options.model || llmConfig.deepResearchModel;
  const timeoutMs = options.timeoutMs || llmConfig.deepResearchTimeoutMs;
  const reasoningEffort: ReasoningEffort =
    options.reasoningEffort || llmConfig.deepResearchReasoningEffort || 'low';
  const debugEnabled = llmConfig.deepResearchDebug;
  const capabilities = getModelCapabilities(model);
  const temperature = capabilities.supportsTemperature
    ? llmConfig.temperatureOverrides.deepResearchTemp ?? capabilities.defaultTemperature
    : undefined;
  const maxOutputTokens = capabilities.supportsMaxOutputTokens
    ? llmConfig.tokenLimits.deepResearchTokens
    : undefined;

  const { tools, usesWebSearch } = buildToolsForModel(model, {
    allowWebSearch: llmConfig.featureToggles.webSearch,
    allowFileSearch: false,
  });

  const start = Date.now();
  logPhaseStart('deepResearch', {
    source: 'agent' as const,
    clientName: input.clientName,
    serviceOfferingName: input.serviceOfferingName,
    model,
    reasoningEffort,
    usesWebSearch,
    usesFileSearch: false,
  });
  logger.info(
    { clientName: input.clientName, model },
    'Deep research request started',
  );

  if (debugEnabled) {
    logger.debug(
      {
        client: input.clientName,
        website: input.clientWebsiteUrl,
        country: input.country,
        sectorHint: input.sectorHint,
        serviceOfferingName: input.serviceOfferingName,
        model,
        timeoutMs,
        reasoningEffort,
      },
      'Deep research debug input',
    );
  }

  let timedOut = false;

  const heartbeat = setInterval(() => {
    logger.info(
      {
        clientName: input.clientName,
        model,
        elapsedMs: Date.now() - start,
      },
      'Deep research still running',
    );
  }, HEARTBEAT_INTERVAL_MS);

  const jsonSchemaDefinition = {
    name: 'client_deep_research_report',
    schema: reportSchema,
  };
  const schemaFormat = {
    type: 'json_schema' as const,
    ...jsonSchemaDefinition,
  };
  const useLegacyResponseFormat = requiresLegacyJsonSchemaFormat(model);

  try {
    const response = (await withTimeout(
      openai.responses.create(
        {
          model,
          ...(capabilities.supportsReasoning
            ? { reasoning: { effort: reasoningEffort } }
            : {}),
          ...(typeof temperature === 'number' ? { temperature } : {}),
          ...(typeof maxOutputTokens === 'number'
            ? { max_output_tokens: maxOutputTokens }
            : {}),
          ...(tools ? { tools } : {}),
          input: [
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildPrompt(input) }],
            },
          ],
          ...(useLegacyResponseFormat
            ? {
                response_format: {
                  type: 'json_schema',
                  json_schema: jsonSchemaDefinition,
                },
              }
            : {
                text: {
                  format: schemaFormat,
                },
              }),
        } as unknown as OpenAI.Responses.ResponseCreateParams,
      ),
      timeoutMs,
      () => {
        timedOut = true;
      },
    )) as OpenAI.Responses.Response;

    const parsedPayload = extractStructuredJson(response);
    if (!parsedPayload) {
      throw new LLMError('Deep Research did not return structured output');
    }

    const durationMs = Date.now() - start;
    const report = parsedPayload as ClientDeepResearchReport;
    logger.info(
      {
        clientName: report.clientName,
        model,
        durationMs,
        responseId: response.id,
      },
      'Deep research report generated',
    );

    if (debugEnabled) {
      logger.debug(
        {
          responseId: response.id,
          outputSummary: response.output?.map((entry) => entry.type),
        },
        'Deep research raw response metadata',
      );
    }

    return report;
  } catch (error) {
    const durationMs = Date.now() - start;
    const message =
      error instanceof Error ? error.message : 'Unknown Deep Research error';

    logger.error(
      {
        clientName: input.clientName,
        model,
        durationMs,
        error: message,
        apiError: formatApiError(error),
        timedOut,
      },
      'Deep research generation failed',
    );

    if (timedOut) {
      throw new LLMError(
        `Deep Research timed out after ${timeoutMs / 1000}s waiting for ${model}`,
      );
    }

    throw new LLMError(message);
  } finally {
    clearInterval(heartbeat);
  }
}


