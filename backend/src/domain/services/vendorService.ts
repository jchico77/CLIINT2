import type { Vendor as PrismaVendor } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { Vendor, CreateVendorInput } from '../models/vendor';

const mapVendor = (record: PrismaVendor): Vendor => ({
  id: record.id,
  name: record.name,
  websiteUrl: record.websiteUrl,
  description: record.description ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export class VendorService {
  static async create(input: CreateVendorInput): Promise<Vendor> {
    const id = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const vendor = await prisma.vendor.create({
      data: {
        id,
        name: input.name,
        websiteUrl: input.websiteUrl,
        description: input.description,
      },
    });
    return mapVendor(vendor);
  }

  static async getById(id: string): Promise<Vendor | null> {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    return vendor ? mapVendor(vendor) : null;
  }

  static async getAll(): Promise<Vendor[]> {
    const vendors = await prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } });
    return vendors.map(mapVendor);
  }

  static async getByVendorId(vendorId: string): Promise<Vendor | null> {
    return this.getById(vendorId);
  }
}

