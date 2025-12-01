export type AdminPhaseId =
  | 'deepResearch'
  | 'clientResearch'
  | 'vendorResearch'
  | 'fitAndStrategy'
  | 'proposalOutline'
  | 'vendorDeepResearch';

export type AdminModelOption =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4.1'
  | 'gpt-4.1-mini'
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-5-nano'
  | 'gpt-5.1'
  | 'o3-mini'
  | 'o3-deep-research';
export type AdminReasoningEffort = 'low' | 'medium' | 'high';
export type AdminTimeoutId = 'deepResearch' | 'agent' | 'fitStrategy' | 'vendorDeepResearch';
export type AdminFeatureToggleId = 'webSearch' | 'fileSearch' | 'dossierContext' | 'proposalBeta';
export type AdminTokenLimitId =
  | 'deepResearchTokens'
  | 'clientResearchTokens'
  | 'vendorResearchTokens'
  | 'fitStrategyTokens'
  | 'vendorDeepResearchTokens';
export type AdminTemperatureId =
  | 'deepResearchTemp'
  | 'clientResearchTemp'
  | 'vendorResearchTemp'
  | 'fitStrategyTemp'
  | 'vendorDeepResearchTemp';
export type AdminSectionLimitId =
  | 'maxStakeholders'
  | 'maxCompetitors'
  | 'maxPlays'
  | 'maxQuestions';
export type AdminLoggingLevel = 'silent' | 'info' | 'debug';
export type AdminRetryId = 'agentRetries' | 'fitStrategyRetries' | 'proposalRetries';
export type AdminAlertToggleId = 'alertOnFallback' | 'alertOnTimeout';
export type AdminDashboardSectionId =
  | 'showOpportunitySummary'
  | 'showStakeholderMap'
  | 'showCompetitiveLandscape'
  | 'showEvidencePack'
  | 'showProposalOutline';
export type AdminLanguageOption = 'es' | 'en' | 'mix';

export interface AdminSettings {
  modelConfig: Record<AdminPhaseId, AdminModelOption>;
  reasoningConfig: Record<AdminPhaseId, AdminReasoningEffort>;
  timeoutConfig: Record<AdminTimeoutId, number>;
  featureToggles: Record<AdminFeatureToggleId, boolean>;
  tokenConfig: Record<AdminTokenLimitId, number>;
  temperatureConfig: Record<AdminTemperatureId, number>;
  sectionLimits: Record<AdminSectionLimitId, number>;
  loggingLevel: AdminLoggingLevel;
  retryConfig: Record<AdminRetryId, number>;
  alertToggles: Record<AdminAlertToggleId, boolean>;
  dashboardVisibility: Record<AdminDashboardSectionId, boolean>;
  sandboxMode: boolean;
  preferredLanguage: AdminLanguageOption;
  vendorAnalysis: {
    autoRunOnCreate: boolean;
  };
  vendorDeepResearchParallel: {
    gpt4ParallelEnabled: boolean;
    gpt5ParallelEnabled: boolean;
    maxConcurrentPhases: number;
    interPhaseDelayMs: number;
  };
}

