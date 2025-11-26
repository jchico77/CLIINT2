import { ClientAccount, CreateClientAccountInput } from '../models/clientAccount';

// In-memory storage
const clients: Map<string, ClientAccount> = new Map();

export class ClientService {
  static create(input: CreateClientAccountInput): ClientAccount {
    const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const client: ClientAccount = {
      id,
      vendorId: input.vendorId,
      name: input.name,
      websiteUrl: input.websiteUrl,
      country: input.country,
      sectorHint: input.sectorHint,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    
    clients.set(id, client);
    return client;
  }

  static getById(id: string): ClientAccount | null {
    return clients.get(id) || null;
  }

  static getByVendorId(vendorId: string): ClientAccount[] {
    return Array.from(clients.values()).filter(c => c.vendorId === vendorId);
  }

  static getAll(): ClientAccount[] {
    return Array.from(clients.values());
  }
}

