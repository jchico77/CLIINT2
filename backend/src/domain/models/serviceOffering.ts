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

