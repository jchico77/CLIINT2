import { Vendor, CreateVendorInput } from '../models/vendor';

// In-memory storage (will be replaced with DB in future)
const vendors: Map<string, Vendor> = new Map();

export class VendorService {
  static create(input: CreateVendorInput): Vendor {
    const id = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const vendor: Vendor = {
      id,
      name: input.name,
      websiteUrl: input.websiteUrl,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };
    
    vendors.set(id, vendor);
    return vendor;
  }

  static getById(id: string): Vendor | null {
    return vendors.get(id) || null;
  }

  static getAll(): Vendor[] {
    return Array.from(vendors.values());
  }

  static getByVendorId(vendorId: string): Vendor | null {
    return this.getById(vendorId);
  }
}

