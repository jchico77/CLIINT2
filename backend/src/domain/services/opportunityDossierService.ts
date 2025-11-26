import { NotFoundError, ValidationError } from '../errors/AppError';
import { OpportunityService } from './opportunityService';
import {
  OpportunityDossier,
  DossierTextChunk,
  CreateDossierTextChunkInput,
} from '../models/opportunityDossier';
import { logger } from '../../lib/logger';

const dossiers: Map<string, OpportunityDossier> = new Map();

const buildChunkId = (): string =>
  `chunk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class OpportunityDossierService {
  private static getOrCreateDossier(opportunityId: string): OpportunityDossier {
    const existing = dossiers.get(opportunityId);
    if (existing) {
      return existing;
    }

    // Ensure opportunity exists before creating dossier
    const opportunity = OpportunityService.getOpportunityById(opportunityId);
    if (!opportunity) {
      throw new NotFoundError('Opportunity', opportunityId);
    }

    const now = new Date().toISOString();
    const dossier: OpportunityDossier = {
      opportunityId,
      textChunks: [],
      openAiFileIds: [],
      createdAt: now,
      updatedAt: now,
    };
    dossiers.set(opportunityId, dossier);
    logger.info({ opportunityId }, 'Opportunity dossier created');
    return dossier;
  }

  static getDossier(opportunityId: string): OpportunityDossier {
    const dossier = dossiers.get(opportunityId);
    if (dossier) {
      return dossier;
    }
    return this.getOrCreateDossier(opportunityId);
  }

  static appendTextChunk(
    opportunityId: string,
    chunkInput: CreateDossierTextChunkInput
  ): DossierTextChunk {
    if (!chunkInput.content.trim()) {
      throw new ValidationError('Dossier chunk content cannot be empty');
    }

    const dossier = this.getOrCreateDossier(opportunityId);
    const chunk: DossierTextChunk = {
      id: buildChunkId(),
      sourceType: chunkInput.sourceType,
      title: chunkInput.title?.trim() || undefined,
      content: chunkInput.content.trim(),
      createdAt: new Date().toISOString(),
    };

    dossier.textChunks.push(chunk);
    dossier.updatedAt = chunk.createdAt;
    logger.info({ opportunityId, chunkId: chunk.id }, 'Dossier text chunk appended');
    return chunk;
  }

  static listTextChunks(opportunityId: string): DossierTextChunk[] {
    const dossier = this.getDossier(opportunityId);
    return dossier.textChunks;
  }

  static attachFileId(opportunityId: string, fileId: string): void {
    if (!fileId.trim()) {
      throw new ValidationError('fileId must not be empty');
    }

    const dossier = this.getOrCreateDossier(opportunityId);
    if (!dossier.openAiFileIds.includes(fileId)) {
      dossier.openAiFileIds.push(fileId);
      dossier.updatedAt = new Date().toISOString();
      logger.info({ opportunityId, fileId }, 'Attached File Search id to dossier');
    }
  }

  static listFileIds(opportunityId: string): string[] {
    const dossier = this.getDossier(opportunityId);
    return dossier.openAiFileIds;
  }

  /** Internal helper useful for tests */
  static clearAll(): void {
    dossiers.clear();
  }
}


