export interface Vendor {
  id: string;
  name: string;
  websiteUrl: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorInput {
  name: string;
  websiteUrl: string;
  description?: string;
}

