import type { Vendor as PrismaVendor } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { Vendor, CreateVendorInput } from '../models/vendor';
import { VendorDeepResearchStatus } from '../models/vendorDeepResearchReport';
import { VendorDeepResearchService } from './vendorDeepResearchService';
import { llmConfig } from '../../config/llm';

type VendorDeepResearchSnapshot = {
  status: VendorDeepResearchStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  llmModelUsed: string | null;
};

type VendorWithResearchReport = PrismaVendor & {
  vendorDeepResearchReport?: VendorDeepResearchSnapshot | null;
};

const mapVendor = (record: VendorWithResearchReport): Vendor => ({
  id: record.id,
  name: record.name,
  websiteUrl: record.websiteUrl,
  description: record.description ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  analysisStatus: (record.vendorDeepResearchReport?.status as VendorDeepResearchStatus) ?? undefined,
  analysisStartedAt: record.vendorDeepResearchReport?.startedAt?.toISOString() ?? null,
  analysisCompletedAt: record.vendorDeepResearchReport?.completedAt?.toISOString() ?? null,
  analysisErrorMessage: record.vendorDeepResearchReport?.errorMessage ?? null,
  analysisModelUsed: record.vendorDeepResearchReport?.llmModelUsed ?? null,
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
    const mapped = mapVendor({ ...vendor, vendorDeepResearchReport: null });

    if (llmConfig.vendorAnalysisAutoRun) {
      void VendorDeepResearchService.enqueueAnalysis(mapped.id).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to enqueue vendor deep research', error);
      });
    }

    return mapped;
  }

  static async getById(id: string): Promise<Vendor | null> {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { vendorDeepResearchReport: true },
    });
    return vendor ? mapVendor(vendor) : null;
  }

  static async getAll(): Promise<Vendor[]> {
    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      include: { vendorDeepResearchReport: true },
    });
    return vendors.map(mapVendor);
  }

  static async getByVendorId(vendorId: string): Promise<Vendor | null> {
    return this.getById(vendorId);
  }

  static async delete(id: string): Promise<void> {
    await prisma.vendor.delete({
      where: { id },
    });
  }
}

