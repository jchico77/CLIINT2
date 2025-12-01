import { AdminSettings } from '../domain/models/adminSettings';

export const defaultAdminSettings: AdminSettings = {
  modelConfig: {
    deepResearch: 'gpt-4o',
    clientResearch: 'gpt-4o',
    vendorResearch: 'gpt-4o',
    fitAndStrategy: 'gpt-4o-mini',
    proposalOutline: 'gpt-4o-mini',
    vendorDeepResearch: 'gpt-4o',
  },
  reasoningConfig: {
    deepResearch: 'low',
    clientResearch: 'medium',
    vendorResearch: 'medium',
    fitAndStrategy: 'medium',
    proposalOutline: 'medium',
    vendorDeepResearch: 'medium',
  },
  timeoutConfig: {
    deepResearch: 600000,
    agent: 240000,
    fitStrategy: 300000,
    vendorDeepResearch: 480000,
  },
  featureToggles: {
    webSearch: true,
    fileSearch: true,
    dossierContext: true,
    proposalBeta: true,
  },
  tokenConfig: {
    deepResearchTokens: 9000,
    clientResearchTokens: 6000,
    vendorResearchTokens: 5000,
    fitStrategyTokens: 7000,
    vendorDeepResearchTokens: 9000,
  },
  temperatureConfig: {
    deepResearchTemp: 0.1,
    clientResearchTemp: 0.2,
    vendorResearchTemp: 0.25,
    fitStrategyTemp: 0.15,
    vendorDeepResearchTemp: 0.2,
  },
  sectionLimits: {
    maxStakeholders: 8,
    maxCompetitors: 4,
    maxPlays: 4,
    maxQuestions: 6,
  },
  loggingLevel: 'info',
  retryConfig: {
    agentRetries: 1,
    fitStrategyRetries: 1,
    proposalRetries: 0,
  },
  alertToggles: {
    alertOnFallback: true,
    alertOnTimeout: false,
  },
  dashboardVisibility: {
    showOpportunitySummary: true,
    showStakeholderMap: true,
    showCompetitiveLandscape: true,
    showEvidencePack: true,
    showProposalOutline: true,
  },
  sandboxMode: true,
  preferredLanguage: 'es',
  vendorAnalysis: {
    autoRunOnCreate: true,
  },
  vendorDeepResearchParallel: {
    gpt4ParallelEnabled: true,
    gpt5ParallelEnabled: true,
    maxConcurrentPhases: 3,
    interPhaseDelayMs: 1200,
  },
};

