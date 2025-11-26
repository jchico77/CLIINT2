import {
  AdminAlertToggleId,
  AdminDashboardSectionId,
  AdminFeatureToggleId,
  AdminModelOption,
  AdminPhaseId,
  AdminReasoningEffort,
  AdminSettings,
  AdminTemperatureId,
  AdminTimeoutId,
  AdminTokenLimitId,
} from './types';

export const ADMIN_PHASES: Array<{
  id: AdminPhaseId;
  label: string;
  description: string;
  defaultModel: AdminModelOption;
}> = [
  {
    id: 'deepResearch',
    label: 'Deep Research',
    description: 'Investigación inicial con web search y generación del informe base.',
    defaultModel: 'gpt-5.1',
  },
  {
    id: 'clientResearch',
    label: 'Client Research Agent',
    description: 'Sintetiza el informe estructurado en secciones ejecutivas.',
    defaultModel: 'gpt-5.1',
  },
  {
    id: 'vendorResearch',
    label: 'Vendor Research Agent',
    description: 'Analiza servicios, diferenciadores y evidencias del vendor.',
    defaultModel: 'gpt-5.1',
  },
  {
    id: 'fitAndStrategy',
    label: 'Fit & Strategy Agent',
    description: 'Crea stakeholder map, plays y gaps estratégicos.',
    defaultModel: 'gpt-5.1',
  },
  {
    id: 'proposalOutline',
    label: 'Proposal Outline Agent',
    description: 'Genera el esquema corto de la propuesta comercial.',
    defaultModel: 'gpt-5.1-mini',
  },
];

export const MODEL_OPTIONS: Array<{ value: AdminModelOption; label: string }> = [
  { value: 'gpt-5.1', label: 'GPT-5.1 (full)' },
  { value: 'gpt-5.1-mini', label: 'GPT-5.1 Mini' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
];

export const REASONING_OPTIONS: Array<{ value: AdminReasoningEffort; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const TIMEOUT_FIELDS: Array<{
  id: AdminTimeoutId;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
}> = [
  {
    id: 'deepResearch',
    label: 'Deep Research timeout (ms)',
    defaultValue: 600000,
    min: 120000,
    max: 900000,
    step: 15000,
    unit: 'ms',
  },
  {
    id: 'agent',
    label: 'Client/Vendor agents timeout (ms)',
    defaultValue: 240000,
    min: 60000,
    max: 480000,
    step: 10000,
    unit: 'ms',
  },
  {
    id: 'fitStrategy',
    label: 'Fit & Strategy timeout (ms)',
    defaultValue: 300000,
    min: 120000,
    max: 600000,
    step: 15000,
    unit: 'ms',
  },
];

export const FEATURE_TOGGLES: Array<{
  id: AdminFeatureToggleId;
  label: string;
  description: string;
  defaultValue: boolean;
}> = [
  {
    id: 'webSearch',
    label: 'Web search habilitado',
    description: 'Permite que los agentes usen web_search_preview por defecto.',
    defaultValue: true,
  },
  {
    id: 'fileSearch',
    label: 'File search / dossier',
    description: 'Adjunta vector stores y permite buscar en los adjuntos.',
    defaultValue: true,
  },
  {
    id: 'dossierContext',
    label: 'Inyectar dossier en prompts',
    description: 'Incluye resumen del dossier en Client y Fit & Strategy.',
    defaultValue: true,
  },
  {
    id: 'proposalBeta',
    label: 'Proposal Outline beta',
    description: 'Activa la generación automática del outline.',
    defaultValue: true,
  },
];

export const TOKEN_FIELDS: Array<{
  id: AdminTokenLimitId;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  {
    id: 'deepResearchTokens',
    label: 'Deep Research máx. tokens',
    defaultValue: 9000,
    min: 2000,
    max: 16000,
    step: 500,
    unit: 'tokens',
  },
  {
    id: 'clientResearchTokens',
    label: 'Client Research máx. tokens',
    defaultValue: 6000,
    min: 2000,
    max: 16000,
    step: 500,
    unit: 'tokens',
  },
  {
    id: 'vendorResearchTokens',
    label: 'Vendor Research máx. tokens',
    defaultValue: 5000,
    min: 2000,
    max: 16000,
    step: 500,
    unit: 'tokens',
  },
  {
    id: 'fitStrategyTokens',
    label: 'Fit & Strategy máx. tokens',
    defaultValue: 7000,
    min: 2000,
    max: 16000,
    step: 500,
    unit: 'tokens',
  },
];

export const TEMPERATURE_FIELDS: Array<{
  id: AdminTemperatureId;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
}> = [
  {
    id: 'deepResearchTemp',
    label: 'Deep Research temperatura',
    defaultValue: 0.1,
    min: 0,
    max: 1,
    step: 0.05,
    decimals: 2,
  },
  {
    id: 'clientResearchTemp',
    label: 'Client Research temperatura',
    defaultValue: 0.2,
    min: 0,
    max: 1,
    step: 0.05,
    decimals: 2,
  },
  {
    id: 'vendorResearchTemp',
    label: 'Vendor Research temperatura',
    defaultValue: 0.25,
    min: 0,
    max: 1,
    step: 0.05,
    decimals: 2,
  },
  {
    id: 'fitStrategyTemp',
    label: 'Fit & Strategy temperatura',
    defaultValue: 0.15,
    min: 0,
    max: 1,
    step: 0.05,
    decimals: 2,
  },
];

export const SECTION_LIMIT_FIELDS: Array<{
  id: AdminSectionLimitId;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  {
    id: 'maxStakeholders',
    label: 'Máx. stakeholders',
    defaultValue: 8,
    min: 1,
    max: 12,
    step: 1,
    unit: 'items',
  },
  {
    id: 'maxCompetitors',
    label: 'Máx. competidores',
    defaultValue: 4,
    min: 1,
    max: 12,
    step: 1,
    unit: 'items',
  },
  {
    id: 'maxPlays',
    label: 'Máx. plays',
    defaultValue: 4,
    min: 1,
    max: 12,
    step: 1,
    unit: 'items',
  },
  {
    id: 'maxQuestions',
    label: 'Máx. preguntas inteligentes',
    defaultValue: 6,
    min: 1,
    max: 12,
    step: 1,
    unit: 'items',
  },
];

export const RETRY_FIELDS: Array<{
  id: AdminRetryId;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  {
    id: 'agentRetries',
    label: 'Retries agentes (Client/Vendor)',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 1,
    unit: 'reintentos',
  },
  {
    id: 'fitStrategyRetries',
    label: 'Retries Fit & Strategy',
    defaultValue: 1,
    min: 0,
    max: 5,
    step: 1,
    unit: 'reintentos',
  },
  {
    id: 'proposalRetries',
    label: 'Retries Proposal Outline',
    defaultValue: 0,
    min: 0,
    max: 5,
    step: 1,
    unit: 'reintentos',
  },
];

export const ALERT_TOGGLES: Array<{
  id: AdminAlertToggleId;
  label: string;
  description: string;
  defaultValue: boolean;
}> = [
  {
    id: 'alertOnFallback',
    label: 'Alertar si caemos a datos fake',
    description: 'Enviar aviso cuando cualquier fase use fallback.',
    defaultValue: true,
  },
  {
    id: 'alertOnTimeout',
    label: 'Alertar timeouts',
    description: 'Notificar si se agota el tiempo configurado.',
    defaultValue: false,
  },
];

export const DASHBOARD_SECTIONS: Array<{
  id: AdminDashboardSectionId;
  label: string;
  defaultValue: boolean;
}> = [
  { id: 'showOpportunitySummary', label: 'Opportunity Summary', defaultValue: true },
  { id: 'showStakeholderMap', label: 'Stakeholder Map', defaultValue: true },
  { id: 'showCompetitiveLandscape', label: 'Competitive Landscape', defaultValue: true },
  { id: 'showEvidencePack', label: 'Evidence Pack', defaultValue: true },
  { id: 'showProposalOutline', label: 'Proposal Outline', defaultValue: true },
];

export const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'mix', label: 'Bilingüe (es/en)' },
] as const;

export const LOGGING_LEVEL_OPTIONS = [
  { value: 'silent', label: 'Silent' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
] as const;

export const TILE_CLASS = 'rounded-md border bg-card shadow-sm px-3 py-2 space-y-1';
export const DENSE_GRID_CLASS = 'grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

export const defaultAdminSettings: AdminSettings = {
  modelConfig: {
    deepResearch: 'gpt-5.1',
    clientResearch: 'gpt-5.1',
    vendorResearch: 'gpt-5.1',
    fitAndStrategy: 'gpt-5.1',
    proposalOutline: 'gpt-5.1-mini',
  },
  reasoningConfig: {
    deepResearch: 'low',
    clientResearch: 'medium',
    vendorResearch: 'medium',
    fitAndStrategy: 'high',
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

