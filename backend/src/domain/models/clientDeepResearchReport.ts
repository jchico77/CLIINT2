export interface ClientDeepResearchReport {
  clientName: string;
  summary: string;
  businessModel: string;
  marketSegments: string[];
  strategicThemes: string[];
  keyRisks: string[];
  macroTrends: string[];
  competitors: Array<{
    name: string;
    description: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  opportunities: string[];
  recommendedAngles: string[];
  sources: Array<{
    title: string;
    url?: string;
    snippet: string;
  }>;
}

export interface ClientDeepResearchInput {
  clientName: string;
  clientWebsiteUrl?: string;
  country?: string;
  sectorHint?: string;
  serviceOfferingName: string;
}


