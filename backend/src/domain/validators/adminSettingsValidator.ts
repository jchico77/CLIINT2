import { z } from 'zod';
import { AdminSettings } from '../models/adminSettings';

const modelOptions = ['gpt-5.1', 'gpt-5.1-mini', 'gpt-5-mini'] as const;
const reasoningEffort = ['low', 'medium', 'high'] as const;
const loggingLevels = ['silent', 'info', 'debug'] as const;
const languages = ['es', 'en', 'mix'] as const;

const modelConfigSchema = z.object({
  deepResearch: z.enum(modelOptions),
  clientResearch: z.enum(modelOptions),
  vendorResearch: z.enum(modelOptions),
  fitAndStrategy: z.enum(modelOptions),
  proposalOutline: z.enum(modelOptions),
});

const reasoningConfigSchema = z.object({
  deepResearch: z.enum(reasoningEffort),
  clientResearch: z.enum(reasoningEffort),
  vendorResearch: z.enum(reasoningEffort),
  fitAndStrategy: z.enum(reasoningEffort),
  proposalOutline: z.enum(reasoningEffort),
});

const timeoutConfigSchema = z.object({
  deepResearch: z.number().int().positive().max(60 * 60 * 1000),
  agent: z.number().int().positive().max(30 * 60 * 1000),
  fitStrategy: z.number().int().positive().max(60 * 60 * 1000),
});

const tokenConfigSchema = z.object({
  deepResearchTokens: z.number().int().min(1000).max(12000),
  clientResearchTokens: z.number().int().min(1000).max(12000),
  vendorResearchTokens: z.number().int().min(1000).max(12000),
  fitStrategyTokens: z.number().int().min(1000).max(12000),
});

const temperatureConfigSchema = z.object({
  deepResearchTemp: z.number().min(0).max(1),
  clientResearchTemp: z.number().min(0).max(1),
  vendorResearchTemp: z.number().min(0).max(1),
  fitStrategyTemp: z.number().min(0).max(1),
});

const sectionLimitSchema = z.object({
  maxStakeholders: z.number().int().min(1).max(20),
  maxCompetitors: z.number().int().min(1).max(10),
  maxPlays: z.number().int().min(1).max(10),
  maxQuestions: z.number().int().min(1).max(12),
});

const featureToggleSchema = z.object({
  webSearch: z.boolean(),
  fileSearch: z.boolean(),
  dossierContext: z.boolean(),
  proposalBeta: z.boolean(),
});

const retryConfigSchema = z.object({
  agentRetries: z.number().int().min(0).max(3),
  fitStrategyRetries: z.number().int().min(0).max(3),
  proposalRetries: z.number().int().min(0).max(3),
});

const alertToggleSchema = z.object({
  alertOnFallback: z.boolean(),
  alertOnTimeout: z.boolean(),
});

const dashboardVisibilitySchema = z.object({
  showOpportunitySummary: z.boolean(),
  showStakeholderMap: z.boolean(),
  showCompetitiveLandscape: z.boolean(),
  showEvidencePack: z.boolean(),
  showProposalOutline: z.boolean(),
});

export const AdminSettingsSchema: z.ZodType<AdminSettings> = z.object({
  modelConfig: modelConfigSchema,
  reasoningConfig: reasoningConfigSchema,
  timeoutConfig: timeoutConfigSchema,
  featureToggles: featureToggleSchema,
  tokenConfig: tokenConfigSchema,
  temperatureConfig: temperatureConfigSchema,
  sectionLimits: sectionLimitSchema,
  loggingLevel: z.enum(loggingLevels),
  retryConfig: retryConfigSchema,
  alertToggles: alertToggleSchema,
  dashboardVisibility: dashboardVisibilitySchema,
  sandboxMode: z.boolean(),
  preferredLanguage: z.enum(languages),
});

export type AdminSettingsValidated = z.infer<typeof AdminSettingsSchema>;

