import { Router, Request, Response } from 'express';
import { ClientService } from '../../domain/services/clientService';
import { CreateClientAccountInput } from '../../domain/models/clientAccount';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateClientAccountInput = req.body;

    if (!input.vendorId || !input.name || !input.websiteUrl) {
      return res.status(400).json({ error: 'vendorId, name, and websiteUrl are required' });
    }

    const client = await ClientService.create(input);
    return res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const vendorId = req.params.vendorId || req.query.vendorId;

    if (vendorId && typeof vendorId === 'string') {
      const clients = await ClientService.getByVendorId(vendorId);
      return res.json(clients);
    }

    const clients = await ClientService.getAll();
    return res.json(clients);
  } catch (error) {
    console.error('Error getting clients:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const client = await ClientService.getById(clientId);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json(client);
  } catch (error) {
    console.error('Error getting client:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

