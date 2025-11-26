import { z } from 'zod';

export const createOpportunitySchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  serviceOfferingId: z.string().min(1, 'Service Offering ID is required'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  estimatedValue: z.number().positive('Estimated value must be positive').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
  deadline: z
    .string()
    .datetime({ message: 'Deadline must be an ISO 8601 datetime string' })
    .optional(),
  ownerUserId: z.string().min(1, 'Owner user ID must not be empty').optional(),
  notes: z.string().max(5000, 'Notes must be shorter than 5000 characters').optional(),
});

export type CreateOpportunityBody = z.infer<typeof createOpportunitySchema>;

