import { Router, Request, Response } from 'express';
import { VendorService } from '../../domain/services/vendorService';
import { CreateVendorInput } from '../../domain/models/vendor';
import { logger } from '../../lib/logger';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateVendorInput = req.body;

    if (!input.name || !input.websiteUrl) {
      return res.status(400).json({ error: 'Name and websiteUrl are required' });
    }

    const vendor = await VendorService.create(input);
    logger.info({ vendorId: vendor.id }, 'Vendor created');
    return res.status(201).json(vendor);
  } catch (error) {
    logger.error({ err: error }, 'Error creating vendor');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const vendors = await VendorService.getAll();
    logger.info({ count: vendors.length }, 'Vendors listed');
    return res.json(vendors);
  } catch (error) {
    logger.error({ err: error }, 'Error listing vendors');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:vendorId', async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const vendor = await VendorService.getById(vendorId);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    logger.info({ vendorId }, 'Vendor retrieved');
    return res.json(vendor);
  } catch (error) {
    logger.error({ err: error, vendorId: req.params.vendorId }, 'Error getting vendor');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

