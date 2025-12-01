import { VendorDeepResearchStatus } from './vendorDeepResearchReport';

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

