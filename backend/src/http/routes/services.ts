import { Router, Request, Response } from 'express';
import { ServiceOfferingService } from '../../domain/services/serviceOfferingService';
import { CreateServiceOfferingInput } from '../../domain/models/serviceOffering';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  try {
    const input: CreateServiceOfferingInput = req.body;
    
    if (!input.vendorId || !input.name || !input.shortDescription) {
      return res.status(400).json({ error: 'vendorId, name, and shortDescription are required' });
    }

    const service = ServiceOfferingService.create(input);
    return res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const vendorId = req.params.vendorId || req.query.vendorId;
    
    if (vendorId && typeof vendorId === 'string') {
      const services = ServiceOfferingService.getByVendorId(vendorId);
      return res.json(services);
    }

    const services = ServiceOfferingService.getAll();
    return res.json(services);
  } catch (error) {
    console.error('Error getting services:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:serviceId', (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const service = ServiceOfferingService.getById(serviceId);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.json(service);
  } catch (error) {
    console.error('Error getting service:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

