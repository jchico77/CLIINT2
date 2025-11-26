import { AdminSettings } from '../domain/models/adminSettings';

export const defaultAdminSettings: AdminSettings = {
  modelConfig: {
    deepResearch: 'gpt-5.1',
    clientResearch: 'gpt-5.1',
    vendorResearch: 'gpt-5.1',
    fitAndStrategy: 'gpt-5.1-mini',
    proposalOutline: 'gpt-5.1-mini',
  },
  reasoningConfig: {
    deepResearch: 'low',
    clientResearch: 'medium',
    vendorResearch: 'medium',
    fitAndStrategy: 'medium',
    proposalOutline: 'medium',
  },
  timeoutConfig: {
    deepResearch: 600000,
    agent: 240000,
    fitStrategy: 300000,
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
  },
  temperatureConfig: {
    deepResearchTemp: 0.1,
    clientResearchTemp: 0.2,
    vendorResearchTemp: 0.25,
    fitStrategyTemp: 0.15,
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
};

