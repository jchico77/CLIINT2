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
  maturity?: 'beta' | 'ga' | 'legacy' | 'unknown';
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

export interface VendorDeepResearchInput {
  vendorId?: string;
  vendorName: string;
  vendorWebsiteUrl: string;
  description?: string;
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

export interface VendorDeepResearchRecord {
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

