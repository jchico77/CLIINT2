// Base types
export type FitLevel = 'high' | 'medium' | 'low';
export type Stance = 'champion' | 'supporter' | 'neutral' | 'skeptic' | 'blocker';
export type InfluenceLevel = 'high' | 'medium' | 'low';
export type EvidenceType = 'case_study' | 'kpi' | 'testimonial' | 'award' | 'certification';
export type GapImpact = 'high' | 'medium' | 'low';
export type DashboardPhase =
  | 'deepResearch'
  | 'clientResearch'
  | 'vendorResearch'
  | 'fitStrategy'
  | 'proposalOutline';

export type DashboardPhaseType =
  | 'deepResearch'
  | 'clientResearch'
  | 'vendorResearch'
  | 'fitStrategy'
  | 'proposalOutline'
  | 'newsResearch'
  | 'persistToDb';

export type DashboardRunStatus = 'success' | 'error';
export type DashboardPhaseStatus = 'success' | 'error';

export interface Opportunity {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  name: string;
  estimatedValue?: number;
  currency?: string;
  deadline?: string;
  ownerUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DossierSourceType =
  | 'rfp'
  | 'brief'
  | 'email'
  | 'meeting_notes'
  | 'other';

export interface DossierTextChunk {
  id: string;
  sourceType: DossierSourceType;
  title?: string;
  content: string;
  createdAt: string;
}

export interface OpportunityDossier {
  opportunityId: string;
  textChunks: DossierTextChunk[];
  openAiFileIds: string[];
  vectorStoreId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppendDossierTextInput {
  sourceType: DossierSourceType;
  title?: string;
  content: string;
}

export interface CreateOpportunityInput {
  clientId: string;
  serviceOfferingId: string;
  name: string;
  estimatedValue?: number;
  currency?: string;
  deadline?: string;
  ownerUserId?: string;
  notes?: string;
}

// Vendor
export type VendorDeepResearchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface VendorDeepResearchNewsItem {
  title: string;
  source: string;
  date: string;
  url?: string;
  summary: string;
  impact?: string;
}

export interface VendorDeepResearchVideoItem {
  title: string;
  channel: string;
  publishedAt: string;
  url: string;
  description: string;
  angle?: string;
}

export interface VendorDeepResearchSocialSignal {
  platform: string;
  summary: string;
  date?: string;
  url?: string;
  relevance?: 'high' | 'medium' | 'low';
}

export interface VendorDeepResearchService {
  name: string;
  description: string;
  categoryTags: string[];
  keyFeatures: string[];
  maturity?: string;
}

export interface VendorDeepResearchCaseStudy {
  title: string;
  client: string;
  challenge: string;
  solution: string;
  results: string[];
  metrics?: string[];
  source?: string;
}

export interface VendorDeepResearchPartnership {
  partner: string;
  type: string;
  description: string;
  announcedAt?: string;
}

export interface VendorDeepResearchAward {
  name: string;
  organization?: string;
  year?: string;
  description?: string;
}

export interface VendorDeepResearchSource {
  title: string;
  url?: string;
  snippet: string;
}

export interface VendorDeepResearchReport {
  vendorName: string;
  websiteUrl: string;
  summary: string;
  businessModel: string;
  valueProposition: string;
  marketSegments: string[];
  servicePortfolio: VendorDeepResearchService[];
  caseStudies: VendorDeepResearchCaseStudy[];
  differentiators: Array<{
    claim: string;
    evidence: string;
    proofPoint?: string;
    sourceUrl?: string;
  }>;
  partnerships: VendorDeepResearchPartnership[];
  awards: VendorDeepResearchAward[];
  newsHighlights: VendorDeepResearchNewsItem[];
  videoHighlights: VendorDeepResearchVideoItem[];
  socialSignals: VendorDeepResearchSocialSignal[];
  sources: VendorDeepResearchSource[];
}

export interface VendorAnalysisRecord {
  id: string;
  vendorId: string;
  status: VendorDeepResearchStatus;
  errorMessage?: string | null;
  report?: VendorDeepResearchReport | null;
  llmModelUsed?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  websiteUrl: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  analysisStatus?: VendorDeepResearchStatus;
  analysisStartedAt?: string | null;
  analysisCompletedAt?: string | null;
  analysisErrorMessage?: string | null;
  analysisModelUsed?: string | null;
}

export interface CreateVendorInput {
  name: string;
  websiteUrl: string;
  description?: string;
}

// Service Offering
export interface ServiceOffering {
  id: string;
  vendorId: string;
  name: string;
  shortDescription: string;
  categoryTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceOfferingInput {
  vendorId: string;
  name: string;
  shortDescription: string;
  categoryTags: string[];
}

// Client Account
export interface ClientAccount {
  id: string;
  vendorId: string;
  name: string;
  websiteUrl: string;
  country?: string;
  sectorHint?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientAccountInput {
  vendorId: string;
  name: string;
  websiteUrl: string;
  country?: string;
  sectorHint?: string;
  notes?: string;
}

// Account Snapshot Section
export interface AccountSnapshotSection {
  companyName: string;
  industry: string;
  headquarters?: string;
  employeeCount?: string;
  revenue?: string;
  description: string;
  keyMetrics: {
    label: string;
    value: string;
  }[];
}

// Opportunity Summary Section (replaces Account Snapshot in main view)
export interface OpportunitySummarySection {
  // Client basic info
  companyName: string;
  industry: string;
  headquarters?: string;
  
  // Opportunity brief description
  opportunityBrief: string;
  
  // Client KPIs
  clientKPIs: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
  }[];
  
  // Opportunity KPIs
  opportunityKPIs: {
    label: string;
    value: string;
    importance?: 'high' | 'medium' | 'low';
  }[];
}

// Market Context Section
export interface MarketContextSection {
  industryTrends: {
    trend: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }[];
  recentEvents: {
    date: string;
    event: string;
    significance: string;
  }[];
  marketSize?: string;
  growthRate?: string;
}

// Opportunity Requirements Section (formerly Strategic Priorities)
export interface OpportunityRequirement {
  id: string;
  category: 'requirement' | 'scope' | 'criteria' | 'exclusion' | 'constraint';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relevanceToService: number; // 0-100
  priorityLevel?: 'must' | 'should' | 'nice';
}

export interface OpportunityRequirementsSection {
  requirements: OpportunityRequirement[];
  whatClientSeeks: string[];
  scope: string[];
  exclusions: string[];
  selectionCriteria: string[];
  summary: string;
}

// News of Interest Section
export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  url?: string;
  relevance: 'high' | 'medium' | 'low';
  summary: string;
  impactOnOpportunity?: string;
}

export interface NewsOfInterestSection {
  items: NewsItem[];
  summary: string;
}

// Critical Dates Section
export interface CriticalDate {
  id: string;
  date: string;
  event: string;
  type: 'deadline' | 'milestone' | 'meeting' | 'decision' | 'other';
  importance: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  stakeholders?: string[];
}

export interface CriticalDatesSection {
  dates: CriticalDate[];
  summary: string;
}

// Stakeholder Map Section
export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  department?: string;
  influence: InfluenceLevel;
  stance: Stance;
  notes?: string;
  priorities?: string[];
}

export interface StakeholderMapSection {
  stakeholders: Stakeholder[];
  summary: string;
}

// Competitive Landscape Section
export interface Competitor {
  id: string;
  name: string;
  type: 'client_competitor' | 'vendor_competitor' | 'alternative_solution';
  description: string;
  strengths?: string[];
  weaknesses?: string[];
}

export interface CompetitiveLandscapeSection {
  clientCompetitors: Competitor[];
  vendorCompetitors: Competitor[];
  alternatives: Competitor[];
  summary: string;
}

// Vendor Fit and Plays Section
export interface FitDimension {
  dimension: string;
  score: number; // 0-100
  reasoning: string;
}

export interface RecommendedPlay {
  id: string;
  name: string;
  description: string;
  rationale: string;
  targetStakeholders: string[];
  successFactors: string[];
}

export interface VendorFitAndPlaysSection {
  overallFit: FitLevel;
  fitScore: number; // 0-100
  fitDimensions: FitDimension[];
  recommendedPlays: RecommendedPlay[];
  summary: string;
}

// Evidence Pack Section
export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  snippet: string;
  source?: string;
  relevance: number; // 0-100
}

export interface EvidencePackSection {
  items: EvidenceItem[];
  summary: string;
}

// Gaps and Questions Section
export interface InformationGap {
  id: string;
  topic: string;
  impact: GapImpact;
  description: string;
  priorityLevel?: 'must' | 'should' | 'nice';
}

export interface IntelligentQuestion {
  id: string;
  question: string;
  context: string;
  targetStakeholder?: string;
  isCritical?: boolean;
}

export interface GapsAndQuestionsSection {
  gaps: InformationGap[];
  questions: IntelligentQuestion[];
  summary: string;
}

export interface ProposalSectionSuggestion {
  id: string;
  title: string;
  purpose: string;
  suggestedContent: string[];
  linkedEvidenceIds: string[];
}

export interface ProposalOutlineLite {
  sections: ProposalSectionSuggestion[];
}

// Complete Dashboard Sections
export interface ClientIntelDashboardSections {
  accountSnapshot: AccountSnapshotSection;
  opportunitySummary: OpportunitySummarySection;
  marketContext: MarketContextSection;
  opportunityRequirements: OpportunityRequirementsSection;
  stakeholderMap: StakeholderMapSection;
  competitiveLandscape: CompetitiveLandscapeSection;
  vendorFitAndPlays: VendorFitAndPlaysSection;
  evidencePack: EvidencePackSection;
  gapsAndQuestions: GapsAndQuestionsSection;
  newsOfInterest: NewsOfInterestSection;
  criticalDates: CriticalDatesSection;
  proposalOutline?: ProposalOutlineLite;
}

// Complete Dashboard
export interface ClientIntelDashboard {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityId: string;
  opportunityName?: string;
  opportunityContext: string;
  generatedAt: string;
  llmModelUsed: string;
  sections: ClientIntelDashboardSections;
  proposalOutline?: ProposalOutlineLite;
}

export interface CreateDashboardInput {
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityContext: string;
  uploadedDocIds?: string[];
}

export interface CreateOpportunityDashboardInput {
  vendorId: string;
  opportunityId: string;
  opportunityContextOverride?: string;
  uploadedDocIds?: string[];
}

export interface CreateDashboardResponse {
  dashboardId: string;
  dashboard: ClientIntelDashboard;
}

// Admin settings
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

export interface DashboardMetricsFilters {
  vendorId?: string;
  clientId?: string;
  model?: string;
  status?: DashboardRunStatus;
  from?: string;
  to?: string;
}

export interface DashboardPhaseInsight {
  phase: DashboardPhaseType;
  executions: number;
  avgDurationMs: number | null;
  maxDurationMs: number | null;
  p95DurationMs: number | null;
}

export interface DashboardModelInsight {
  model: string;
  totalRuns: number;
  avgDurationMs: number | null;
}

export interface DashboardPhaseMetricSnapshot {
  id: string;
  phase: DashboardPhaseType;
  status: DashboardPhaseStatus;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface DashboardRunMetric {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityId: string | null;
  status: DashboardRunStatus;
  llmModelUsed: string | null;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  phases: DashboardPhaseMetricSnapshot[];
}

export interface DashboardMetricsResponse {
  summary: {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number | null;
    from: string | null;
    to: string | null;
  };
  models: DashboardModelInsight[];
  phases: DashboardPhaseInsight[];
  recentRuns: DashboardRunMetric[];
  filters: {
    vendorId?: string;
    model?: string;
    status?: DashboardRunStatus;
    from: string | null;
    to: string | null;
  };
  vendorDeepResearch: {
    summary: {
      totalAnalyses: number;
      completed: number;
      failed: number;
      avgDurationMs: number | null;
    };
    models: Array<{
      model: string;
      totalAnalyses: number;
      avgDurationMs: number | null;
    }>;
    recent: Array<{
      id: string;
      vendorId: string;
      vendorName: string;
      status: VendorDeepResearchStatus;
      llmModelUsed: string | null;
      durationMs: number | null;
      startedAt: string | null;
      completedAt: string | null;
      errorMessage: string | null;
      analysisId: string | null;
    }>;
    timings: {
      phases: Array<{
        phase: 'overview' | 'portfolio' | 'proofPoints' | 'signals';
        phaseLabel: string;
        avgDurationMs: number | null;
        samples: number;
        subPhases: Array<{
          subPhase:
            | 'summary'
            | 'portfolio'
            | 'evidence-cases'
            | 'evidence-partnerships'
            | 'evidence-awards'
            | 'signals-news'
            | 'signals-videos'
            | 'signals-social';
          subPhaseLabel: string;
          avgDurationMs: number | null;
          samples: number;
        }>;
      }>;
    };
    recentPhaseRuns: Array<{
      analysisId: string;
      vendorId: string;
      vendorName: string;
      llmModelUsed: string | null;
      status: VendorDeepResearchStatus;
      completedAt: string | null;
      phases: Array<{
        phase: 'overview' | 'portfolio' | 'proofPoints' | 'signals';
        phaseLabel: string;
        subPhases: Array<{
          subPhase:
            | 'summary'
            | 'portfolio'
            | 'evidence-cases'
            | 'evidence-partnerships'
            | 'evidence-awards'
            | 'signals-news'
            | 'signals-videos'
            | 'signals-social';
          subPhaseLabel: string;
          durationMs: number | null;
        }>;
      }>;
    }>;
  };
}

