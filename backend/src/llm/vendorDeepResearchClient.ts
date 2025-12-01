import OpenAI from 'openai';
import type { ParsedResponse } from 'openai/resources/responses/responses';
import { llmConfig } from '../config/llm';
import { LLMError } from '../domain/errors/AppError';
import {
  VendorDeepResearchInput,
  VendorDeepResearchReport,
} from '../domain/models/vendorDeepResearchReport';
import { logger } from '../lib/logger';
import { logPhaseStart } from './phaseLogger';
import {
  buildToolsForModel,
  getModelCapabilities,
  requiresLegacyJsonSchemaFormat,
} from './modelCapabilities';
import {
  VendorDeepResearchPhaseCategory,
  VendorDeepResearchSubPhaseId,
  vendorDeepResearchPhaseCatalog,
} from '../domain/models/vendorDeepResearchPhases';
import vendorDeepResearchSummarySchema from './schemas/vendorDeepResearchSummary.json';
import vendorDeepResearchPortfolioSchema from './schemas/vendorDeepResearchPortfolio.json';
import vendorDeepResearchEvidenceCasesSchema from './schemas/vendorDeepResearchEvidenceCases.json';
import vendorDeepResearchEvidencePartnershipsSchema from './schemas/vendorDeepResearchEvidencePartnerships.json';
import vendorDeepResearchEvidenceAwardsSchema from './schemas/vendorDeepResearchEvidenceAwards.json';
import vendorDeepResearchSignalsNewsSchema from './schemas/vendorDeepResearchSignalsNews.json';
import vendorDeepResearchSignalsVideosSchema from './schemas/vendorDeepResearchSignalsVideos.json';
import vendorDeepResearchSignalsSocialSchema from './schemas/vendorDeepResearchSignalsSocial.json';
import { logLLMCall } from '../utils/llmLogger';

type ReasoningEffort = 'low' | 'medium' | 'high';

const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_PARSE_ATTEMPTS = 3;

const openai = new OpenAI({
  apiKey: llmConfig.openaiApiKey,
});

const sleep = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const cleanModelText = (text: string): string =>
  text.replace(/¯ê[^¯]*¯êü/gu, '').replace(/[\u241E\u241F]/g, '');

const stripCodeFence = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  return cleanModelText(cleaned);
};

const extractJsonFragment = (text: string): string | null => {
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
};

const tryParseJson = <T>(raw: string): T | null => {
  const cleaned = stripCodeFence(raw);
  if (!cleaned) {
    return null;
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const fragment = extractJsonFragment(cleaned);
    if (fragment) {
      try {
        return JSON.parse(fragment) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const extractStructuredJson = <T>(
  response: OpenAI.Responses.Response,
): T => {
  const outputEntries =
    (response.output as Array<{ content?: Array<{ type: string; [key: string]: unknown }> }>) ?? [];

  for (const entry of outputEntries) {
    const jsonChunk = entry.content?.find(
      (item): item is { type: 'output_json'; json: T } =>
        item?.type === 'output_json' && 'json' in item,
    );
    if (jsonChunk) {
      return jsonChunk.json;
    }
  }

  const candidates: string[] = [];

  const chunkTexts = outputEntries
    .map((chunk) => {
      if ('content' in chunk && Array.isArray(chunk.content)) {
        return chunk.content
          .filter(
            (item) =>
              (item.type === 'output_text' || item.type === 'text') &&
              typeof item.text === 'string',
          )
          .map((item) => item.text as string)
          .join('');
      }
      return '';
    })
    .filter((value) => value.trim().length > 0);

  if (chunkTexts.length) {
    candidates.push(...chunkTexts);
    const stitched = chunkTexts.join('');
    if (stitched.trim().length > 0) {
      candidates.push(stitched);
    }
  }

  if (Array.isArray(response.output_text) && response.output_text.length > 0) {
    const stitched = response.output_text.join('');
    if (stitched.trim().length > 0) {
      candidates.push(stitched);
    }
  }

  for (const candidate of candidates) {
    const parsed = tryParseJson<T>(candidate);
    if (parsed) {
      return parsed;
    }
  }

  logger.warn(
    {
      responseId: response.id,
      candidateSample: candidates[0]?.slice(0, 400) ?? null,
    },
    'Vendor Deep Research response missing structured output',
  );

  throw new LLMError('Vendor Deep Research returned no structured output');
};

const extractParsedContent = <T>(response: ParsedResponse<T>): T => {
  if (response.output_parsed) {
    return response.output_parsed;
  }

  const outputs = response.output ?? [];
  for (const block of outputs) {
    if (!('content' in block) || !Array.isArray(block.content)) {
      continue;
    }
    for (const item of block.content) {
      if (item && 'parsed' in item && item.parsed) {
        return item.parsed as T;
      }
    }
  }

  logger.warn(
    {
      responseId: response.id ?? null,
    },
    'Vendor Deep Research parsed response missing structured output',
  );
  throw new LLMError('Vendor Deep Research returned no structured output');
};

const buildRetryInstruction = (attempt: number, error: unknown): string => {
  const header = `Reintento ${attempt}: la respuesta anterior no era JSON válido según el schema proporcionado.`;
  const ensureJson =
    'Responde de nuevo únicamente con JSON estricto que cumpla el schema al 100 %, sin texto adicional, comentarios ni fragmentos sueltos.';
  const errorHint =
    error instanceof Error && error.message
      ? `Detalle del error detectado: ${error.message}`
      : '';
  return [header, ensureJson, errorHint].filter(Boolean).join(' ');
};

const isJsonParseError = (error: unknown): boolean => {
  if (error instanceof SyntaxError) {
    return true;
  }
  if (error instanceof Error) {
    return /json/i.test(error.message) || /structured output/i.test(error.message);
  }
  return false;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error('VENDOR_DEEP_RESEARCH_TIMEOUT'));
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

type SummaryPhaseResult = Pick<
  VendorDeepResearchReport,
  'vendorName' | 'websiteUrl' | 'summary' | 'businessModel' | 'valueProposition' | 'marketSegments'
>;
type PortfolioPhaseResult = Pick<VendorDeepResearchReport, 'servicePortfolio' | 'differentiators'>;
type EvidenceCasesResult = Pick<VendorDeepResearchReport, 'caseStudies'>;
type EvidencePartnershipsResult = Pick<VendorDeepResearchReport, 'partnerships'>;
type EvidenceAwardsResult = Pick<VendorDeepResearchReport, 'awards'>;
type SignalsNewsResult = Pick<VendorDeepResearchReport, 'newsHighlights' | 'sources'>;
type SignalsVideosResult = Pick<VendorDeepResearchReport, 'videoHighlights'>;
type SignalsSocialResult = Pick<VendorDeepResearchReport, 'socialSignals'>;

interface PhaseDefinition<T extends Partial<VendorDeepResearchReport>> {
  id: VendorDeepResearchSubPhaseId;
  label: string;
  schemaName: string;
  schema: Record<string, unknown>;
  allowWebSearch: boolean;
  buildPrompt: (input: VendorDeepResearchInput) => string;
  merge: (report: VendorDeepResearchReport, partial: T) => void;
}

export interface VendorDeepResearchPhaseTiming {
  phase: VendorDeepResearchPhaseCategory;
  subPhase: VendorDeepResearchSubPhaseId;
  durationMs: number;
  startedAt: Date;
  finishedAt: Date;
}

const ANALYST_SYSTEM_PROMPT =
  'Eres un analista B2B senior. Responde únicamente en JSON válido siguiendo el schema solicitado.';

const createEmptyReport = (input: VendorDeepResearchInput): VendorDeepResearchReport => ({
  vendorName: input.vendorName,
  websiteUrl: input.vendorWebsiteUrl,
  summary: '',
  businessModel: '',
  valueProposition: '',
  marketSegments: [],
  servicePortfolio: [],
  caseStudies: [],
  differentiators: [],
  partnerships: [],
  awards: [],
  newsHighlights: [],
  videoHighlights: [],
  socialSignals: [],
  sources: [],
});

type PhaseMessage = {
  role: 'system' | 'user';
  content: Array<{ type: 'input_text'; text: string }>;
};

const buildPhaseMessages = (
  phasePrompt: string,
  extraInstruction?: string,
): PhaseMessage[] => {
  const messages: PhaseMessage[] = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: ANALYST_SYSTEM_PROMPT }],
    },
    {
      role: 'user',
      content: [{ type: 'input_text', text: phasePrompt }],
    },
  ];
  if (extraInstruction) {
    messages.push({
      role: 'user',
      content: [{ type: 'input_text', text: extraInstruction }],
    });
  }
  return messages;
};

const buildSummaryPrompt = (input: VendorDeepResearchInput): string =>
  `
Analiza ${input.vendorName} (${input.vendorWebsiteUrl}) y genera una visión ejecutiva.

Devuelve exclusivamente JSON con los campos: vendorName, websiteUrl, summary (máx 4 frases), businessModel, valueProposition, marketSegments (lista de nichos clave). Prioriza signals verificables y evita adornos.
`.trim();

const buildPortfolioPrompt = (input: VendorDeepResearchInput): string =>
  `
Describe el portfolio actual de ${input.vendorName}. Analiza servicios, prácticas y diferenciales tangibles respecto a competidores.

Devuelve únicamente JSON con:
- servicePortfolio: lista de servicios, cada uno con name, description, categoryTags, keyFeatures y maturity (usa "unknown" si no está claro).
- differentiators: lista de claims con evidence, proofPoint (cita breve) y sourceUrl (https://...) apuntando al artículo/fuente exacta. Si no existe URL pública, usa null en sourceUrl y explícítalo en evidence.
`.trim();

const buildEvidenceCasesPrompt = (input: VendorDeepResearchInput): string =>
  `
Recopila los casos de éxito verificables más recientes de ${input.vendorName}. Para cada uno incluye cliente, reto, solución y resultados cuantificables si existen.

Devuelve sólo JSON con:
- caseStudies (title, client, challenge, solution, results[], metrics, source).
`.trim();

const buildEvidencePartnershipsPrompt = (input: VendorDeepResearchInput): string =>
  `
Identifica partnerships estratégicos relevantes de ${input.vendorName} (cloud, ISV, integradores, alianzas locales). Describe qué aporta cada socio.

Devuelve únicamente JSON con:
- partnerships (partner, type, description, announcedAt).
`.trim();

const buildEvidenceAwardsPrompt = (input: VendorDeepResearchInput): string =>
  `
Enumera premios, certificaciones o rankings logrados por ${input.vendorName} en los últimos 24 meses. Explica el contexto si es relevante.

Devuelve sólo JSON con:
- awards (name, organization, year, description).
`.trim();

const buildSignalsNewsPrompt = (input: VendorDeepResearchInput): string =>
  `
Busca en prensa y blogs los tres titulares más relevantes sobre ${input.vendorName} en los últimos 6-9 meses. Incluye siempre la URL y un resumen breve.

Devuelve únicamente JSON con:
- newsHighlights (title, source, date, url, summary, impact). Las URLs deben apuntar directamente al artículo original (https://) sin placeholders como "unknown" ni páginas genéricas.
- sources (title, url, snippet) listando referencias usadas.
`.trim();

const buildSignalsVideosPrompt = (input: VendorDeepResearchInput): string =>
  `
Encuentra los vídeos más recientes (propios o de terceros) en YouTube/Talks/streams donde se mencione a ${input.vendorName}. Resume el enfoque.

Devuelve sólo JSON con:
- videoHighlights (title, channel, publishedAt, url, description, angle). El campo url debe enlazar al vídeo original (YouTube, Vimeo, sitio del evento) y nunca puede ser vacío.
`.trim();

const buildSignalsSocialPrompt = (input: VendorDeepResearchInput): string =>
  `
Detecta señales sociales relevantes sobre ${input.vendorName} (LinkedIn, X/Twitter, comunidades). Prioriza lanzamientos, contrataciones o campañas.

Devuelve únicamente JSON con:
- socialSignals (platform, summary, date, url, relevance). Si la plataforma es LinkedIn, devuelve el enlace exacto del post (linkedin.com/...). No enlaces a notas de prensa o páginas corporativas.
`.trim();

const PHASE_DEFINITIONS: PhaseDefinition<
  | SummaryPhaseResult
  | PortfolioPhaseResult
  | EvidenceCasesResult
  | EvidencePartnershipsResult
  | EvidenceAwardsResult
  | SignalsNewsResult
  | SignalsVideosResult
  | SignalsSocialResult
>[] = [
  {
    id: 'summary',
    label: 'Executive overview',
    schemaName: 'vendor_deep_research_summary_phase',
    schema: vendorDeepResearchSummarySchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildSummaryPrompt,
    merge: (report, partial) => {
      const data = partial as SummaryPhaseResult;
      report.vendorName = data.vendorName || report.vendorName;
      report.websiteUrl = data.websiteUrl || report.websiteUrl;
      report.summary = data.summary || report.summary;
      report.businessModel = data.businessModel || report.businessModel;
      report.valueProposition = data.valueProposition || report.valueProposition;
      report.marketSegments = data.marketSegments ?? report.marketSegments;
    },
  },
  {
    id: 'portfolio',
    label: 'Portfolio & differentiators',
    schemaName: 'vendor_deep_research_portfolio_phase',
    schema: vendorDeepResearchPortfolioSchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildPortfolioPrompt,
    merge: (report, partial) => {
      const data = partial as PortfolioPhaseResult;
      report.servicePortfolio = data.servicePortfolio ?? report.servicePortfolio;
      report.differentiators = data.differentiators ?? report.differentiators;
    },
  },
  {
    id: 'evidence-cases',
    label: 'Proof points · Case studies',
    schemaName: 'vendor_deep_research_evidence_cases_phase',
    schema: vendorDeepResearchEvidenceCasesSchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildEvidenceCasesPrompt,
    merge: (report, partial) => {
      const data = partial as EvidenceCasesResult;
      report.caseStudies = data.caseStudies ?? report.caseStudies;
    },
  },
  {
    id: 'evidence-partnerships',
    label: 'Proof points · Partnerships',
    schemaName: 'vendor_deep_research_evidence_partnerships_phase',
    schema: vendorDeepResearchEvidencePartnershipsSchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildEvidencePartnershipsPrompt,
    merge: (report, partial) => {
      const data = partial as EvidencePartnershipsResult;
      report.partnerships = data.partnerships ?? report.partnerships;
    },
  },
  {
    id: 'evidence-awards',
    label: 'Proof points · Awards',
    schemaName: 'vendor_deep_research_evidence_awards_phase',
    schema: vendorDeepResearchEvidenceAwardsSchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildEvidenceAwardsPrompt,
    merge: (report, partial) => {
      const data = partial as EvidenceAwardsResult;
      report.awards = data.awards ?? report.awards;
    },
  },
  {
    id: 'signals-news',
    label: 'Market signals · News',
    schemaName: 'vendor_deep_research_signals_news_phase',
    schema: vendorDeepResearchSignalsNewsSchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildSignalsNewsPrompt,
    merge: (report, partial) => {
      const data = partial as SignalsNewsResult;
      report.newsHighlights = data.newsHighlights ?? report.newsHighlights;
      report.sources = data.sources ?? report.sources;
    },
  },
  {
    id: 'signals-videos',
    label: 'Market signals · Videos',
    schemaName: 'vendor_deep_research_signals_videos_phase',
    schema: vendorDeepResearchSignalsVideosSchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildSignalsVideosPrompt,
    merge: (report, partial) => {
      const data = partial as SignalsVideosResult;
      report.videoHighlights = data.videoHighlights ?? report.videoHighlights;
    },
  },
  {
    id: 'signals-social',
    label: 'Market signals · Social',
    schemaName: 'vendor_deep_research_signals_social_phase',
    schema: vendorDeepResearchSignalsSocialSchema as Record<string, unknown>,
    allowWebSearch: true,
    buildPrompt: buildSignalsSocialPrompt,
    merge: (report, partial) => {
      const data = partial as SignalsSocialResult;
      report.socialSignals = data.socialSignals ?? report.socialSignals;
    },
  },
];

const FALLBACK_MODEL_CANDIDATES = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'];
const toModelKey = (model: string): string => model.trim().toLowerCase();
const isGpt5FamilyModel = (model: string): boolean => toModelKey(model).startsWith('gpt-5');
const isGpt4FamilyModel = (model: string): boolean => toModelKey(model).startsWith('gpt-4');

const createPhaseLaunchGate = (delayMs: number) => {
  let lastLaunchAt = 0;
  let chain = Promise.resolve();

  return (): Promise<void> => {
    chain = chain.then(async () => {
      if (lastLaunchAt !== 0 && delayMs > 0) {
        const elapsed = Date.now() - lastLaunchAt;
        if (elapsed < delayMs) {
          await sleep(delayMs - elapsed);
        }
      }
      lastLaunchAt = Date.now();
    });
    return chain;
  };
};

const resolveFallbackModel = (primary: string): string | null => {
  if (primary.startsWith('gpt-4')) {
    return null;
  }
  return FALLBACK_MODEL_CANDIDATES.find((candidate) => candidate !== primary) || null;
};

const createModelRuntimeConfig = (model: string) => {
  const capabilities = getModelCapabilities(model);
  const temperature = capabilities.supportsTemperature
    ? llmConfig.temperatureOverrides.vendorDeepResearchTemp ??
      llmConfig.temperatureOverrides.deepResearchTemp ??
      capabilities.defaultTemperature
    : undefined;
  const maxOutputTokens = capabilities.supportsMaxOutputTokens
    ? llmConfig.tokenLimits.vendorDeepResearchTokens ?? llmConfig.tokenLimits.deepResearchTokens
    : undefined;
  return { capabilities, temperature, maxOutputTokens };
};

const shouldFallbackPhase = (error: unknown): boolean =>
  error instanceof LLMError || isJsonParseError(error);

interface PhaseExecutionResult<T> {
  partial: T;
  responseId?: string;
  modelUsed: string;
  runtime: {
    temperature?: number;
    maxTokens?: number;
  };
  usesWebSearch: boolean;
}

interface StructuredRetryParams {
  requestBuilder: (extraInstruction?: string) => OpenAI.Responses.ResponseCreateParams;
  timeoutMs: number;
  vendorName: string;
  model: string;
  phaseId: VendorDeepResearchSubPhaseId;
  onTimeout: () => void;
}

const runStructuredPhaseWithRetries = async <T>({
  requestBuilder,
  timeoutMs,
  vendorName,
  model,
  phaseId,
  onTimeout,
}: StructuredRetryParams): Promise<{ parsed: T; responseId?: string }> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_PARSE_ATTEMPTS; attempt += 1) {
    const extraInstruction = attempt === 0 ? undefined : buildRetryInstruction(attempt, lastError);

    try {
      const response = (await withTimeout(
        openai.responses.parse(
          requestBuilder(extraInstruction) as unknown as OpenAI.Responses.ResponseCreateParams,
        ),
        timeoutMs,
        onTimeout,
      )) as ParsedResponse<T>;
      return {
        parsed: extractParsedContent(response),
        responseId: response.id,
      };
    } catch (error) {
      const shouldRetry =
        isJsonParseError(error) && attempt < MAX_PARSE_ATTEMPTS - 1;

      if (shouldRetry) {
        logger.warn(
          {
            vendorName,
            model,
            phase: phaseId,
            attempt: attempt + 1,
            error: error instanceof Error ? error.message : String(error),
          },
          'Vendor deep research structured output parse failed, retrying',
        );
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw new LLMError('Vendor Deep Research failed to parse structured output after retries');
};

const runLegacyPhase = async <T>(
  request: OpenAI.Responses.ResponseCreateParams,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<{ parsed: T; responseId?: string }> => {
  const response = (await withTimeout(
    openai.responses.create(request),
    timeoutMs,
    onTimeout,
  )) as OpenAI.Responses.Response;

  return {
    parsed: extractStructuredJson<T>(response),
    responseId: response.id,
  };
};

const runPhaseForModel = async <T extends Partial<VendorDeepResearchReport>>(
  phase: PhaseDefinition<T>,
  modelName: string,
  phasePrompt: string,
  vendorName: string,
  reasoningEffort: ReasoningEffort,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<PhaseExecutionResult<T>> => {
  const { capabilities, temperature, maxOutputTokens } = createModelRuntimeConfig(modelName);
  const allowWebSearch = phase.allowWebSearch && llmConfig.featureToggles.webSearch;
  const { tools, usesWebSearch } = buildToolsForModel(modelName, {
    allowWebSearch,
    allowFileSearch: false,
  });

  const schemaDefinition = {
    name: phase.schemaName,
    schema: phase.schema,
  };

  const baseRequest: OpenAI.Responses.ResponseCreateParams = {
    model: modelName,
    ...(capabilities.supportsReasoning ? { reasoning: { effort: reasoningEffort } } : {}),
    ...(typeof temperature === 'number' ? { temperature } : {}),
    ...(typeof maxOutputTokens === 'number' ? { max_output_tokens: maxOutputTokens } : {}),
    ...(tools ? { tools } : {}),
  };

  const useLegacyResponseFormat = requiresLegacyJsonSchemaFormat(modelName);

  const requestBuilder = (extraInstruction?: string): OpenAI.Responses.ResponseCreateParams => ({
    ...baseRequest,
    input: buildPhaseMessages(phasePrompt, extraInstruction),
    ...(useLegacyResponseFormat
      ? {
          response_format: {
            type: 'json_schema',
            json_schema: schemaDefinition,
          },
        }
      : {
          text: {
            format: {
              type: 'json_schema',
              name: schemaDefinition.name,
              schema: schemaDefinition.schema,
            },
          },
        }),
  });

  if (!useLegacyResponseFormat) {
    const structured = await runStructuredPhaseWithRetries<T>({
      requestBuilder,
      timeoutMs,
      vendorName,
      model: modelName,
      phaseId: phase.id,
      onTimeout,
    });
    return {
      partial: structured.parsed,
      responseId: structured.responseId,
      modelUsed: modelName,
      runtime: { temperature, maxTokens: maxOutputTokens },
      usesWebSearch,
    };
  }

  const legacy = await runLegacyPhase<T>(requestBuilder(), timeoutMs, onTimeout);
  return {
    partial: legacy.parsed,
    responseId: legacy.responseId,
    modelUsed: modelName,
    runtime: { temperature, maxTokens: maxOutputTokens },
    usesWebSearch,
  };
};

const runPhaseWithFallback = async <T extends Partial<VendorDeepResearchReport>>(
  phase: PhaseDefinition<T>,
  primaryModel: string,
  fallbackModel: string | null,
  reasoningEffort: ReasoningEffort,
  timeoutMs: number,
  phasePrompt: string,
  vendorName: string,
  onTimeout: () => void,
): Promise<PhaseExecutionResult<T>> => {
  try {
    return await runPhaseForModel(
      phase,
      primaryModel,
      phasePrompt,
      vendorName,
      reasoningEffort,
      timeoutMs,
      onTimeout,
    );
  } catch (error) {
    if (
      !fallbackModel ||
      fallbackModel === primaryModel ||
      !shouldFallbackPhase(error)
    ) {
      throw error;
    }

    logger.warn(
      {
        phase: phase.id,
        vendorName,
        fromModel: primaryModel,
        toModel: fallbackModel,
        error: error instanceof Error ? error.message : String(error),
      },
      'Vendor deep research phase falling back to alternate model',
    );

    return runPhaseForModel(
      phase,
      fallbackModel,
      phasePrompt,
      vendorName,
      reasoningEffort,
      timeoutMs,
      onTimeout,
    );
  }
};


export interface RunVendorDeepResearchOptions {
  model?: string;
  timeoutMs?: number;
  reasoningEffort?: ReasoningEffort;
}

interface VendorDeepResearchResult {
  report: VendorDeepResearchReport;
  modelUsed: string;
  phaseMetrics: VendorDeepResearchPhaseTiming[];
}

export async function runVendorDeepResearch(
  input: VendorDeepResearchInput,
  options: RunVendorDeepResearchOptions = {},
): Promise<VendorDeepResearchResult> {
  if (!llmConfig.openaiApiKey) {
    throw new LLMError('OPENAI_API_KEY is required to use Vendor Deep Research');
  }

  const primaryModel =
    options.model || llmConfig.vendorDeepResearchModel || llmConfig.deepResearchModel;
  const fallbackModel = resolveFallbackModel(primaryModel);
  const timeoutMs =
    options.timeoutMs || llmConfig.vendorDeepResearchTimeoutMs || llmConfig.deepResearchTimeoutMs;
  const reasoningEffort: ReasoningEffort =
    options.reasoningEffort ||
    llmConfig.vendorDeepResearchReasoningEffort ||
    llmConfig.deepResearchReasoningEffort ||
    'medium';

  const start = Date.now();
  let timedOut = false;

  logPhaseStart('deepResearch', {
    source: 'agent' as const,
    vendorName: input.vendorName,
    model: primaryModel,
    reasoningEffort,
    usesWebSearch: llmConfig.featureToggles.webSearch,
    usesFileSearch: false,
  });

  const heartbeat = setInterval(() => {
    logger.info(
      { vendorName: input.vendorName, elapsedMs: Date.now() - start },
      'Vendor deep research still running',
    );
  }, HEARTBEAT_INTERVAL_MS);

  const report = createEmptyReport(input);
  const fallbackModelsUsed = new Set<string>();

  const phaseMetrics: VendorDeepResearchPhaseTiming[] = [];
  const parallelConfig = llmConfig.vendorDeepResearchParallelConfig;
  const parallelFamily: 'gpt5' | 'gpt4' | null = (() => {
    if (isGpt5FamilyModel(primaryModel) && parallelConfig.gpt5ParallelEnabled) {
      return 'gpt5';
    }
    if (isGpt4FamilyModel(primaryModel) && parallelConfig.gpt4ParallelEnabled) {
      return 'gpt4';
    }
    return null;
  })();
  const shouldUseParallelism = Boolean(parallelFamily);
  const phaseLaunchGate: (() => Promise<void>) | null = shouldUseParallelism
    ? createPhaseLaunchGate(parallelConfig.interPhaseDelayMs)
    : null;

  const runPhaseTask = async (
    phase: (typeof PHASE_DEFINITIONS)[number],
    options?: { preStart?: () => Promise<void> },
  ): Promise<void> => {
    const phasePrompt = phase.buildPrompt(input);

    if (options?.preStart) {
      await options.preStart();
    }

    const phaseStart = Date.now();
    const phaseStartedAt = new Date(phaseStart);

    const phaseResult = await runPhaseWithFallback(
      phase,
      primaryModel,
      fallbackModel,
      reasoningEffort,
      timeoutMs,
      phasePrompt,
      input.vendorName,
      () => {
        timedOut = true;
      },
    );

    phase.merge(report, phaseResult.partial);

    if (phaseResult.modelUsed !== primaryModel) {
      fallbackModelsUsed.add(phaseResult.modelUsed);
    }

    const phaseFinishedAt = new Date();
    const durationMs = phaseFinishedAt.getTime() - phaseStartedAt.getTime();

    logLLMCall({
      opportunityId: input.vendorId,
      phase: `vendorDeepResearch:${phase.id}`,
      model: phaseResult.modelUsed,
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      userPrompt: phasePrompt,
      options: {
        temperature: phaseResult.runtime.temperature,
        maxTokens: phaseResult.runtime.maxTokens,
        responseFormat: { type: 'json_schema' },
      },
      response: JSON.stringify(phaseResult.partial),
      responseTimeMs: durationMs,
      metadata: {
        vendorName: input.vendorName,
        phase: phase.id,
        usesWebSearch: phaseResult.usesWebSearch,
      },
    });

    const catalogEntry = vendorDeepResearchPhaseCatalog[phase.id];
    phaseMetrics.push({
      phase: catalogEntry.phase,
      subPhase: phase.id,
      durationMs,
      startedAt: phaseStartedAt,
      finishedAt: phaseFinishedAt,
    });

    logger.info(
      {
        vendorName: input.vendorName,
        phase: phase.id,
        model: phaseResult.modelUsed,
        responseId: phaseResult.responseId,
        parallel: shouldUseParallelism,
        parallelFamily,
      },
      'Vendor deep research phase completed',
    );
  };

  const runSequentialPhases = async (): Promise<void> => {
    for (const phase of PHASE_DEFINITIONS) {
      await runPhaseTask(phase);
    }
  };

  const runParallelPhases = async (): Promise<void> => {
    const queue = [...PHASE_DEFINITIONS];
    const workerCount = Math.min(
      Math.max(1, parallelConfig.maxConcurrentPhases),
      queue.length,
    );
    const gate = phaseLaunchGate ?? (() => Promise.resolve());

    const runNext = async (): Promise<void> => {
      const nextPhase = queue.shift();
      if (!nextPhase) {
        return;
      }
      await runPhaseTask(nextPhase, { preStart: gate });
      await runNext();
    };

    await Promise.all(Array.from({ length: workerCount }, () => runNext()));
  };

  try {
    if (shouldUseParallelism) {
      await runParallelPhases();
    } else {
      await runSequentialPhases();
    }

    const durationMs = Date.now() - start;
    const modelDescriptor =
      fallbackModelsUsed.size === 0
        ? primaryModel
        : `${primaryModel} (fallback: ${Array.from(fallbackModelsUsed).join(', ')})`;

    logLLMCall({
      opportunityId: input.vendorId,
      phase: 'vendorDeepResearch',
      model: modelDescriptor,
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      userPrompt: 'Vendor deep research phased aggregation',
      options: {},
      response: JSON.stringify(report),
      responseTimeMs: durationMs,
      metadata: {
        vendorName: input.vendorName,
      },
    });

    logger.info(
      {
        vendorName: input.vendorName,
        durationMs,
        model: modelDescriptor,
      },
      'Vendor deep research report generated',
    );

    return { report, modelUsed: modelDescriptor, phaseMetrics };
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown vendor deep research error';

    logLLMCall({
      opportunityId: input.vendorId,
      phase: 'vendorDeepResearch',
      model: primaryModel,
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      userPrompt: 'Vendor deep research phased aggregation',
      options: {},
      response: `ERROR: ${message}`,
      responseTimeMs: durationMs,
      metadata: {
        vendorName: input.vendorName,
        error: true,
      },
    });

    logger.error(
      {
        vendorName: input.vendorName,
        model: primaryModel,
        durationMs,
        timedOut,
        error: message,
      },
      'Vendor deep research failed',
    );

    if (timedOut) {
      throw new LLMError(
        `Vendor Deep Research timed out after ${Math.floor(timeoutMs / 1000)}s waiting for ${primaryModel}`,
      );
    }

    throw new LLMError(message);
  } finally {
    clearInterval(heartbeat);
  }
}

