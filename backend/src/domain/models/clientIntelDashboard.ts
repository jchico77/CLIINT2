// Base types
export type FitLevel = 'high' | 'medium' | 'low';
export type Stance = 'champion' | 'supporter' | 'neutral' | 'skeptic' | 'blocker';
export type InfluenceLevel = 'high' | 'medium' | 'low';
export type EvidenceType = 'case_study' | 'kpi' | 'testimonial' | 'award' | 'certification';
export type GapImpact = 'high' | 'medium' | 'low';

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
}

export interface IntelligentQuestion {
  id: string;
  question: string;
  context: string;
  targetStakeholder?: string;
}

export interface GapsAndQuestionsSection {
  gaps: InformationGap[];
  questions: IntelligentQuestion[];
  summary: string;
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
}

// Complete Dashboard
export interface ClientIntelDashboard {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityContext: string;
  generatedAt: string;
  llmModelUsed: string;
  sections: ClientIntelDashboardSections;
}

export interface CreateDashboardInput {
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityContext: string;
  uploadedDocIds?: string[];
}

