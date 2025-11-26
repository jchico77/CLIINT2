// LLM configuration
import { AdminSettings } from '../domain/models/adminSettings';
import { defaultAdminSettings } from './adminSettingsDefaults';
import { logger } from '../lib/logger';
import { secretsConfig } from './secrets';

type ReasoningEffort = 'low' | 'medium' | 'high';

export interface LLMConfig {
  openaiApiKey: string;
  defaultModel: string;
  temperature: number;
  deepResearchModel: string;
  deepResearchTimeoutMs: number;
  deepResearchReasoningEffort: ReasoningEffort;
  deepResearchDebug: boolean;
  clientResearchModel: string;
  clientResearchReasoningEffort: ReasoningEffort;
  vendorResearchModel: string;
  vendorResearchReasoningEffort: ReasoningEffort;
  fitStrategyModel: string;
  fitStrategyReasoningEffort: ReasoningEffort;
  proposalOutlineModel: string;
  proposalOutlineReasoningEffort: ReasoningEffort;
  agentTimeoutMs: number;
  fitStrategyTimeoutMs: number;
  loggingLevel: 'silent' | 'info' | 'debug';
  sandboxMode: boolean;
  preferredLanguage: 'es' | 'en' | 'mix';
  tokenLimits: AdminSettings['tokenConfig'];
  temperatureOverrides: AdminSettings['temperatureConfig'];
  sectionLimits: AdminSettings['sectionLimits'];
  featureToggles: AdminSettings['featureToggles'];
  retryConfig: AdminSettings['retryConfig'];
  alertToggles: AdminSettings['alertToggles'];
  dashboardVisibility: AdminSettings['dashboardVisibility'];
  vendorEvidenceVectorStoreId?: string;
}

const parseTimeout = (raw: string | undefined, fallback: number): number => {
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const adminDefaults = defaultAdminSettings;
const resolvedOpenAIApiKey =
  process.env.OPENAI_API_KEY || secretsConfig.openaiApiKey || '';

export const llmConfig: LLMConfig = {
  openaiApiKey: resolvedOpenAIApiKey,
  defaultModel: process.env.LLM_MODEL || 'gpt-4o',
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  deepResearchModel: process.env.DEEP_RESEARCH_MODEL || adminDefaults.modelConfig.deepResearch,
  deepResearchTimeoutMs: parseTimeout(
    process.env.DEEP_RESEARCH_TIMEOUT_MS,
    adminDefaults.timeoutConfig.deepResearch,
  ),
  deepResearchReasoningEffort:
    (process.env.DEEP_RESEARCH_REASONING as ReasoningEffort) ||
    adminDefaults.reasoningConfig.deepResearch,
  deepResearchDebug: process.env.DEEP_RESEARCH_DEBUG === '1',
  clientResearchModel: process.env.CLIENT_RESEARCH_MODEL || adminDefaults.modelConfig.clientResearch,
  clientResearchReasoningEffort:
    (process.env.CLIENT_RESEARCH_REASONING as ReasoningEffort) ||
    adminDefaults.reasoningConfig.clientResearch,
  vendorResearchModel: process.env.VENDOR_RESEARCH_MODEL || adminDefaults.modelConfig.vendorResearch,
  vendorResearchReasoningEffort:
    (process.env.VENDOR_RESEARCH_REASONING as ReasoningEffort) ||
    adminDefaults.reasoningConfig.vendorResearch,
  fitStrategyModel: process.env.FIT_STRATEGY_MODEL || adminDefaults.modelConfig.fitAndStrategy,
  fitStrategyReasoningEffort:
    (process.env.FIT_STRATEGY_REASONING as ReasoningEffort) ||
    adminDefaults.reasoningConfig.fitAndStrategy,
  proposalOutlineModel:
    process.env.PROPOSAL_OUTLINE_MODEL || adminDefaults.modelConfig.proposalOutline,
  proposalOutlineReasoningEffort:
    (process.env.PROPOSAL_OUTLINE_REASONING as ReasoningEffort) ||
    adminDefaults.reasoningConfig.proposalOutline,
  agentTimeoutMs: parseTimeout(
    process.env.AGENT_TIMEOUT_MS,
    adminDefaults.timeoutConfig.agent,
  ),
  fitStrategyTimeoutMs: parseTimeout(
    process.env.FIT_STRATEGY_TIMEOUT_MS,
    adminDefaults.timeoutConfig.fitStrategy,
  ),
  loggingLevel:
    (process.env.LOG_LEVEL as 'silent' | 'info' | 'debug') || adminDefaults.loggingLevel,
  sandboxMode: adminDefaults.sandboxMode,
  preferredLanguage: adminDefaults.preferredLanguage,
  tokenLimits: { ...adminDefaults.tokenConfig },
  temperatureOverrides: { ...adminDefaults.temperatureConfig },
  sectionLimits: { ...adminDefaults.sectionLimits },
  featureToggles: { ...adminDefaults.featureToggles },
  retryConfig: { ...adminDefaults.retryConfig },
  alertToggles: { ...adminDefaults.alertToggles },
  dashboardVisibility: { ...adminDefaults.dashboardVisibility },
  vendorEvidenceVectorStoreId: process.env.VENDOR_EVIDENCE_VECTOR_STORE_ID,
};

export const applyAdminSettings = (settings: AdminSettings): void => {
  llmConfig.deepResearchModel = settings.modelConfig.deepResearch;
  llmConfig.clientResearchModel = settings.modelConfig.clientResearch;
  llmConfig.vendorResearchModel = settings.modelConfig.vendorResearch;
  llmConfig.fitStrategyModel = settings.modelConfig.fitAndStrategy;
  llmConfig.proposalOutlineModel = settings.modelConfig.proposalOutline;

  llmConfig.deepResearchReasoningEffort = settings.reasoningConfig.deepResearch;
  llmConfig.clientResearchReasoningEffort = settings.reasoningConfig.clientResearch;
  llmConfig.vendorResearchReasoningEffort = settings.reasoningConfig.vendorResearch;
  llmConfig.fitStrategyReasoningEffort = settings.reasoningConfig.fitAndStrategy;
  llmConfig.proposalOutlineReasoningEffort = settings.reasoningConfig.proposalOutline;

  llmConfig.deepResearchTimeoutMs = settings.timeoutConfig.deepResearch;
  llmConfig.agentTimeoutMs = settings.timeoutConfig.agent;
  llmConfig.fitStrategyTimeoutMs = settings.timeoutConfig.fitStrategy;

  llmConfig.loggingLevel = settings.loggingLevel;
  llmConfig.sandboxMode = settings.sandboxMode;
  llmConfig.preferredLanguage = settings.preferredLanguage;

  llmConfig.tokenLimits = { ...settings.tokenConfig };
  llmConfig.temperatureOverrides = { ...settings.temperatureConfig };
  llmConfig.sectionLimits = { ...settings.sectionLimits };
  llmConfig.featureToggles = { ...settings.featureToggles };
  llmConfig.retryConfig = { ...settings.retryConfig };
  llmConfig.alertToggles = { ...settings.alertToggles };
  llmConfig.dashboardVisibility = { ...settings.dashboardVisibility };

  logger.info('[LLMConfig] Admin overrides applied');
  logger.level = settings.loggingLevel;
};

if (!llmConfig.openaiApiKey) {
  console.warn('⚠️  OPENAI_API_KEY not set. LLM features will not work.');
}

