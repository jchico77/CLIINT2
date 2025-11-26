import { ServiceOffering, CreateServiceOfferingInput } from '../models/serviceOffering';

// In-memory storage
const services: Map<string, ServiceOffering> = new Map();

export class ServiceOfferingService {
  static create(input: CreateServiceOfferingInput): ServiceOffering {
    const id = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const service: ServiceOffering = {
      id,
      vendorId: input.vendorId,
      name: input.name,
      shortDescription: input.shortDescription,
      categoryTags: input.categoryTags,
      createdAt: now,
      updatedAt: now,
    };
    
    services.set(id, service);
    return service;
  }

  static getById(id: string): ServiceOffering | null {
    return services.get(id) || null;
  }

  static getByVendorId(vendorId: string): ServiceOffering[] {
    return Array.from(services.values()).filter(s => s.vendorId === vendorId);
  }

  static getAll(): ServiceOffering[] {
    return Array.from(services.values());
  }
}

