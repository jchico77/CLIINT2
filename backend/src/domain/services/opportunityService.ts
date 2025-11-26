import type { Opportunity as PrismaOpportunity } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateOpportunityInput, Opportunity } from '../models/opportunity';
import { logger } from '../../lib/logger';

const generateOpportunityId = (): string =>
  `opportunity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const mapOpportunity = (record: PrismaOpportunity): Opportunity => ({
  id: record.id,
  vendorId: record.vendorId,
  clientId: record.clientId,
  serviceOfferingId: record.serviceOfferingId,
  name: record.name,
  estimatedValue: record.estimatedValue ?? undefined,
  currency: record.currency ?? undefined,
  deadline: record.deadline ? record.deadline.toISOString() : undefined,
  ownerUserId: record.ownerUserId ?? undefined,
  notes: record.notes ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export class OpportunityService {
  static async createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
    const id = generateOpportunityId();
    const opportunity = await prisma.opportunity.create({
      data: {
        id,
        vendorId: input.vendorId,
        clientId: input.clientId,
        serviceOfferingId: input.serviceOfferingId,
        name: input.name,
        estimatedValue: input.estimatedValue ?? null,
        currency: input.currency ? input.currency.toUpperCase() : null,
        deadline: input.deadline ? new Date(input.deadline) : null,
        ownerUserId: input.ownerUserId ?? null,
        notes: input.notes ?? null,
      },
    });

    logger.info(
      { opportunityId: id, vendorId: input.vendorId },
      'Opportunity created successfully',
    );

    return mapOpportunity(opportunity);
  }

  static async getOpportunityById(opportunityId: string): Promise<Opportunity | null> {
    const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    return opportunity ? mapOpportunity(opportunity) : null;
  }

  static async listOpportunitiesByVendor(vendorId: string): Promise<Opportunity[]> {
    const records = await prisma.opportunity.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapOpportunity);
  }
}


