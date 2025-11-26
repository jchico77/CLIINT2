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

export interface CreateOpportunityInput {
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  name: string;
  estimatedValue?: number;
  currency?: string;
  deadline?: string;
  ownerUserId?: string;
  notes?: string;
}


