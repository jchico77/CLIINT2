import { z } from 'zod';

export const createDossierTextChunkSchema = z.object({
  sourceType: z.enum(['rfp', 'brief', 'email', 'meeting_notes', 'other']),
  title: z.string().trim().max(200, 'Title must be 200 characters or less').optional(),
  content: z
    .string()
    .trim()
    .min(10, 'Content must be at least 10 characters')
    .max(10_000, 'Content must be at most 10,000 characters'),
});

export type CreateDossierTextChunkBody = z.infer<typeof createDossierTextChunkSchema>;


