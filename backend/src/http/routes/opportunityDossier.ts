import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { createDossierTextChunkSchema } from '../../domain/validators/opportunityDossierValidators';
import { OpportunityDossierService } from '../../domain/services/opportunityDossierService';
import { ValidationError } from '../../domain/errors/AppError';
import { logger } from '../../lib/logger';
import { FileSearchService } from '../../llm/fileSearchService';

const opportunityDossierRouter = Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB por archivo
  },
});

const getOpportunityId = (req: Request): string => {
  const { opportunityId } = req.params;
  if (!opportunityId) {
    throw new ValidationError('opportunityId parameter is required');
  }
  return opportunityId;
};

opportunityDossierRouter.post(
  '/:opportunityId/dossier/text',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunityId = getOpportunityId(req);
      const parsedBody = createDossierTextChunkSchema.safeParse(req.body);

      if (!parsedBody.success) {
        throw new ValidationError('Invalid dossier chunk payload', {
          issues: parsedBody.error.flatten(),
        });
      }

      const chunk = await OpportunityDossierService.appendTextChunk(
        opportunityId,
        parsedBody.data,
      );

      logger.info(
        { opportunityId, chunkId: chunk.id },
        'Dossier text chunk stored via HTTP',
      );

      return res.status(201).json(chunk);
    } catch (error) {
      return next(error);
    }
  },
);

opportunityDossierRouter.get(
  '/:opportunityId/dossier',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunityId = getOpportunityId(req);
      const dossier = await OpportunityDossierService.getDossier(opportunityId);
      return res.json(dossier);
    } catch (error) {
      return next(error);
    }
  },
);

opportunityDossierRouter.post(
  '/:opportunityId/dossier/files',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunityId = getOpportunityId(req);
      const { file } = req;

      if (!file) {
        throw new ValidationError('A single file field named "file" is required');
      }

      const existingVectorStoreId =
        await OpportunityDossierService.getVectorStoreId(opportunityId);
      const vectorStoreId = await FileSearchService.ensureVectorStore(
        opportunityId,
        existingVectorStoreId,
      );
      if (vectorStoreId && !existingVectorStoreId) {
        await OpportunityDossierService.setVectorStoreId(opportunityId, vectorStoreId);
      }

      const fileId = vectorStoreId
        ? await FileSearchService.uploadFileToVectorStore({
            opportunityId,
            vectorStoreId,
            buffer: file.buffer,
            filename: file.originalname,
          })
        : null;

      const finalFileId =
        fileId ??
        `file_local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await OpportunityDossierService.attachFileId(opportunityId, finalFileId);

      return res.status(201).json({
        fileId: finalFileId,
        vectorStoreId,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export { opportunityDossierRouter };


