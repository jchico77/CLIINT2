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

