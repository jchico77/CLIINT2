import OpenAI from 'openai';
import { AdminModelOption } from '../domain/models/adminSettings';
import { logger } from '../lib/logger';

export interface ModelCapabilities {
  supportsWebSearch: boolean;
  supportsFileSearch: boolean;
  supportsReasoning: boolean;
  supportsTemperature: boolean;
  supportsMaxOutputTokens: boolean;
  defaultTemperature: number;
}

type ResponseTool = NonNullable<OpenAI.Responses.ResponseCreateParams['tools']>[number];
type ResponseToolResources = {
  file_search?: {
    vector_store_ids: string[];
  };
};

type ModelKey = AdminModelOption | (string & {});

const MODEL_CAPABILITIES: Record<ModelKey, ModelCapabilities> = {
  'gpt-4o': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: false,
    supportsTemperature: true,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.4,
  },
  'gpt-4o-mini': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: false,
    supportsTemperature: true,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.5,
  },
  'gpt-4.1': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: false,
    supportsTemperature: true,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.3,
  },
  'gpt-4.1-mini': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: false,
    supportsTemperature: true,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.4,
  },
  'gpt-5': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: true,
    supportsTemperature: false,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.3,
  },
  'gpt-5-mini': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: true,
    supportsTemperature: false,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.4,
  },
  'gpt-5-nano': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: false,
    supportsTemperature: false,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.5,
  },
  'gpt-5.1': {
    supportsWebSearch: true,
    supportsFileSearch: true,
    supportsReasoning: true,
    supportsTemperature: false,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.2,
  },
  'o3-mini': {
    supportsWebSearch: false,
    supportsFileSearch: false,
    supportsReasoning: true,
    supportsTemperature: false,
    supportsMaxOutputTokens: true,
    defaultTemperature: 1,
  },
  'o3-deep-research': {
    supportsWebSearch: false,
    supportsFileSearch: false,
    supportsReasoning: true,
    supportsTemperature: false,
    supportsMaxOutputTokens: true,
    defaultTemperature: 0.2,
  },
};

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  supportsWebSearch: false,
  supportsFileSearch: false,
  supportsReasoning: false,
  supportsTemperature: true,
  supportsMaxOutputTokens: true,
  defaultTemperature: 0.3,
};

export const getModelCapabilities = (model: string): ModelCapabilities =>
  MODEL_CAPABILITIES[model] || DEFAULT_CAPABILITIES;

interface ToolConfig {
  allowWebSearch: boolean;
  allowFileSearch: boolean;
  vectorStoreId?: string;
}

export const buildToolsForModel = (
  model: string,
  { allowWebSearch, allowFileSearch, vectorStoreId }: ToolConfig,
): {
  tools?: OpenAI.Responses.ResponseCreateParams['tools'];
  toolResources?: ResponseToolResources;
  usesWebSearch: boolean;
  usesFileSearch: boolean;
} => {
  const capabilities = getModelCapabilities(model);
  const tools: ResponseTool[] = [];
  let toolResources: ResponseToolResources | undefined;
  let usesWebSearch = false;
  let usesFileSearch = false;

  if (allowWebSearch && capabilities.supportsWebSearch) {
    tools.push({ type: 'web_search' });
    usesWebSearch = true;
  } else if (allowWebSearch && !capabilities.supportsWebSearch) {
    logger.warn({ model }, 'Web search requested but not supported by model');
  }

  if (allowFileSearch && vectorStoreId) {
    if (capabilities.supportsFileSearch) {
      tools.push({ type: 'file_search' } as ResponseTool);
      toolResources = { file_search: { vector_store_ids: [vectorStoreId] } };
      usesFileSearch = true;
    } else {
      logger.warn({ model }, 'File search requested but not supported by model');
    }
  }

  return {
    tools: tools.length ? tools : undefined,
    toolResources,
    usesWebSearch,
    usesFileSearch,
  };
};

export const requiresLegacyJsonSchemaFormat = (model: string): boolean =>
  model === 'o3-deep-research';
