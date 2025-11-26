import { Router, Request, Response } from 'express';
import { VendorService } from '../../domain/services/vendorService';
import { CreateVendorInput } from '../../domain/models/vendor';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateVendorInput = req.body;

    if (!input.name || !input.websiteUrl) {
      return res.status(400).json({ error: 'Name and websiteUrl are required' });
    }

    const vendor = await VendorService.create(input);
    return res.status(201).json(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
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

    return res.json(vendor);
  } catch (error) {
    console.error('Error getting vendor:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

