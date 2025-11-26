import type { ServiceOffering as PrismaServiceOffering } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ServiceOffering, CreateServiceOfferingInput } from '../models/serviceOffering';

const mapServiceOffering = (record: PrismaServiceOffering): ServiceOffering => ({
  id: record.id,
  vendorId: record.vendorId,
  name: record.name,
  shortDescription: record.shortDescription,
  categoryTags: record.categoryTags,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export class ServiceOfferingService {
  static async create(input: CreateServiceOfferingInput): Promise<ServiceOffering> {
    const id = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const service = await prisma.serviceOffering.create({
      data: {
        id,
        vendorId: input.vendorId,
        name: input.name,
        shortDescription: input.shortDescription,
        categoryTags: input.categoryTags,
      },
    });
    return mapServiceOffering(service);
  }

  static async getById(id: string): Promise<ServiceOffering | null> {
    const service = await prisma.serviceOffering.findUnique({ where: { id } });
    return service ? mapServiceOffering(service) : null;
  }

  static async getByVendorId(vendorId: string): Promise<ServiceOffering[]> {
    const services = await prisma.serviceOffering.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
    return services.map(mapServiceOffering);
  }

  static async getAll(): Promise<ServiceOffering[]> {
    const services = await prisma.serviceOffering.findMany({ orderBy: { createdAt: 'desc' } });
    return services.map(mapServiceOffering);
  }
}

