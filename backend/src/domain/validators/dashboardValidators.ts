import { z } from 'zod';

export const CreateDashboardInputSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  serviceOfferingId: z.string().min(1, 'Service Offering ID is required'),
  opportunityContext: z.string().min(10, 'Opportunity context must be at least 10 characters'),
  uploadedDocIds: z.array(z.string()).optional(),
});

export type CreateDashboardInputValidated = z.infer<typeof CreateDashboardInputSchema>;

