export type OpportunityStage =
  | 'early'
  | 'rfp'
  | 'shortlist'
  | 'bafo'
  | 'won'
  | 'lost';

export interface Opportunity {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  name: string;
  stage: OpportunityStage;
  estimatedValue?: number;
  currency?: string;
  deadline?: string;
  ownerUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityInput {
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  name: string;
  stage?: OpportunityStage;
  estimatedValue?: number;
  currency?: string;
  deadline?: string;
  ownerUserId?: string;
  notes?: string;
}


