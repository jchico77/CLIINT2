import { CreateOpportunityInput, Opportunity } from '../models/opportunity';
import { logger } from '../../lib/logger';

const opportunities: Map<string, Opportunity> = new Map();

const generateOpportunityId = (): string =>
  `opportunity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export class OpportunityService {
  static createOpportunity(input: CreateOpportunityInput): Opportunity {
    const id = generateOpportunityId();
    const now = new Date().toISOString();

    const opportunity: Opportunity = {
      id,
      vendorId: input.vendorId,
      clientId: input.clientId,
      serviceOfferingId: input.serviceOfferingId,
      name: input.name,
      stage: input.stage ?? 'early',
      estimatedValue: input.estimatedValue,
      currency: input.currency?.toUpperCase(),
      deadline: input.deadline,
      ownerUserId: input.ownerUserId,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    opportunities.set(id, opportunity);
    logger.info(
      { opportunityId: id, vendorId: input.vendorId },
      'Opportunity created successfully',
    );

    return opportunity;
  }

  static getOpportunityById(opportunityId: string): Opportunity | null {
    return opportunities.get(opportunityId) ?? null;
  }

  static listOpportunitiesByVendor(vendorId: string): Opportunity[] {
    return Array.from(opportunities.values()).filter(
      (opportunity) => opportunity.vendorId === vendorId,
    );
  }
}


