import type { ClientAccount as PrismaClientAccount } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ClientAccount, CreateClientAccountInput } from '../models/clientAccount';

const mapClient = (record: PrismaClientAccount): ClientAccount => ({
  id: record.id,
  vendorId: record.vendorId,
  name: record.name,
  websiteUrl: record.websiteUrl,
  country: record.country ?? undefined,
  sectorHint: record.sectorHint ?? undefined,
  notes: record.notes ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export class ClientService {
  static async create(input: CreateClientAccountInput): Promise<ClientAccount> {
    const id = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const client = await prisma.clientAccount.create({
      data: {
        id,
        vendorId: input.vendorId,
        name: input.name,
        websiteUrl: input.websiteUrl,
        country: input.country,
        sectorHint: input.sectorHint,
        notes: input.notes,
      },
    });
    return mapClient(client);
  }

  static async getById(id: string): Promise<ClientAccount | null> {
    const client = await prisma.clientAccount.findUnique({ where: { id } });
    return client ? mapClient(client) : null;
  }

  static async getByVendorId(vendorId: string): Promise<ClientAccount[]> {
    const clients = await prisma.clientAccount.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
    return clients.map(mapClient);
  }

  static async getAll(): Promise<ClientAccount[]> {
    const clients = await prisma.clientAccount.findMany({ orderBy: { createdAt: 'desc' } });
    return clients.map(mapClient);
  }
}

