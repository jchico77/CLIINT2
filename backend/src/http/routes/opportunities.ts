import { NextFunction, Request, Response, Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { createOpportunitySchema } from '../../domain/validators/opportunityValidators';
import { ValidationError, NotFoundError } from '../../domain/errors/AppError';
import { VendorService } from '../../domain/services/vendorService';
import { ClientService } from '../../domain/services/clientService';
import { ServiceOfferingService } from '../../domain/services/serviceOfferingService';
import { OpportunityService } from '../../domain/services/opportunityService';

const vendorOpportunitiesRouter: ExpressRouter = Router({ mergeParams: true });
const opportunityRouter: ExpressRouter = Router();

const assertVendorParam = async (vendorId?: string): Promise<string> => {
  if (!vendorId) {
    throw new ValidationError('vendorId parameter is required');
  }
  const vendor = await VendorService.getById(vendorId);
  if (!vendor) {
    throw new NotFoundError('Vendor', vendorId);
  }
  return vendorId;
};

vendorOpportunitiesRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = await assertVendorParam(req.params.vendorId);
      const parsedBody = createOpportunitySchema.safeParse(req.body);

      if (!parsedBody.success) {
        throw new ValidationError('Invalid opportunity payload', {
          issues: parsedBody.error.flatten(),
        });
      }

      const body = parsedBody.data;

      const client = await ClientService.getById(body.clientId);
      if (!client) {
        throw new NotFoundError('Client', body.clientId);
      }
      if (client.vendorId !== vendorId) {
        throw new ValidationError('Client does not belong to the vendor', {
          vendorId,
          clientVendorId: client.vendorId,
        });
      }

      const serviceOffering = await ServiceOfferingService.getById(
        body.serviceOfferingId,
      );
      if (!serviceOffering) {
        throw new NotFoundError('ServiceOffering', body.serviceOfferingId);
      }
      if (serviceOffering.vendorId !== vendorId) {
        throw new ValidationError('Service offering does not belong to vendor', {
          vendorId,
          serviceVendorId: serviceOffering.vendorId,
        });
      }

      const opportunity = await OpportunityService.createOpportunity({
        vendorId,
        ...body,
      });

      return res.status(201).json(opportunity);
    } catch (error) {
      return next(error);
    }
  },
);

vendorOpportunitiesRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = await assertVendorParam(req.params.vendorId);
      const opportunities = await OpportunityService.listOpportunitiesByVendor(vendorId);
      return res.json(opportunities);
    } catch (error) {
      return next(error);
    }
  },
);

opportunityRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId =
        typeof req.query.vendorId === 'string' && req.query.vendorId.length > 0
          ? req.query.vendorId
          : undefined;
      const opportunities = await OpportunityService.listOpportunities({ vendorId });
      return res.json(opportunities);
    } catch (error) {
      return next(error);
    }
  },
);

opportunityRouter.get(
  '/:opportunityId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { opportunityId } = req.params;
      if (!opportunityId) {
        throw new ValidationError('opportunityId parameter is required');
      }
      const opportunity = await OpportunityService.getOpportunityById(opportunityId);
      if (!opportunity) {
        throw new NotFoundError('Opportunity', opportunityId);
      }
      return res.json(opportunity);
    } catch (error) {
      return next(error);
    }
  },
);

export { vendorOpportunitiesRouter, opportunityRouter };


