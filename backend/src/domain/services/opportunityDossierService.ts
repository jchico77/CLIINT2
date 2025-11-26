import type {
  OpportunityDossier as PrismaDossier,
  DossierTextChunk as PrismaTextChunk,
  DossierFile as PrismaDossierFile,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { OpportunityService } from './opportunityService';
import {
  OpportunityDossier,
  DossierTextChunk,
  CreateDossierTextChunkInput,
} from '../models/opportunityDossier';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

const mapChunk = (chunk: PrismaTextChunk): DossierTextChunk => ({
  id: chunk.id,
  sourceType: chunk.sourceType as DossierTextChunk['sourceType'],
  title: chunk.title ?? undefined,
  content: chunk.content,
  createdAt: chunk.createdAt.toISOString(),
});

const mapDossier = (
  record: PrismaDossier & { textChunks: PrismaTextChunk[]; files: PrismaDossierFile[] },
): OpportunityDossier => ({
  opportunityId: record.opportunityId,
  textChunks: record.textChunks
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(mapChunk),
  openAiFileIds: record.files.map((file) => file.openAiFileId),
  vectorStoreId: record.vectorStoreId ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export class OpportunityDossierService {
  private static async getOrCreateDossierRecord(opportunityId: string) {
    let dossier = await prisma.opportunityDossier.findUnique({
      where: { opportunityId },
      include: { textChunks: true, files: true },
    });
    if (dossier) {
      return dossier;
    }

    const opportunity = await OpportunityService.getOpportunityById(opportunityId);
    if (!opportunity) {
      throw new NotFoundError('Opportunity', opportunityId);
    }

    dossier = await prisma.opportunityDossier.create({
      data: {
        opportunityId,
      },
      include: { textChunks: true, files: true },
    });
    logger.info({ opportunityId }, 'Opportunity dossier created');
    return dossier;
  }

  static async getDossier(opportunityId: string): Promise<OpportunityDossier> {
    const dossier = await this.getOrCreateDossierRecord(opportunityId);
    return mapDossier(dossier);
  }

  static async appendTextChunk(
    opportunityId: string,
    chunkInput: CreateDossierTextChunkInput,
  ): Promise<DossierTextChunk> {
    if (!chunkInput.content.trim()) {
      throw new ValidationError('Dossier chunk content cannot be empty');
    }

    await this.getOrCreateDossierRecord(opportunityId);
    const chunk = await prisma.dossierTextChunk.create({
      data: {
        opportunityId,
        sourceType: chunkInput.sourceType,
        title: chunkInput.title?.trim() || null,
        content: chunkInput.content.trim(),
      },
    });

    logger.info({ opportunityId, chunkId: chunk.id }, 'Dossier text chunk appended');
    return mapChunk(chunk);
  }

  static async listTextChunks(opportunityId: string): Promise<DossierTextChunk[]> {
    await this.getOrCreateDossierRecord(opportunityId);
    const chunks = await prisma.dossierTextChunk.findMany({
      where: { opportunityId },
      orderBy: { createdAt: 'asc' },
    });
    return chunks.map(mapChunk);
  }

  static async attachFileId(opportunityId: string, fileId: string): Promise<void> {
    if (!fileId.trim()) {
      throw new ValidationError('fileId must not be empty');
    }

    await this.getOrCreateDossierRecord(opportunityId);
    const existing = await prisma.dossierFile.findFirst({
      where: { opportunityId, openAiFileId: fileId },
    });
    if (existing) {
      return;
    }
    await prisma.dossierFile.create({
      data: { opportunityId, openAiFileId: fileId },
    });
    logger.info({ opportunityId, fileId }, 'Attached File Search id to dossier');
  }

  static async listFileIds(opportunityId: string): Promise<string[]> {
    await this.getOrCreateDossierRecord(opportunityId);
    const files = await prisma.dossierFile.findMany({
      where: { opportunityId },
      orderBy: { createdAt: 'asc' },
      select: { openAiFileId: true },
    });
    return files.map((file) => file.openAiFileId);
  }

  static async getVectorStoreId(opportunityId: string): Promise<string | undefined> {
    const dossier = await this.getOrCreateDossierRecord(opportunityId);
    return dossier.vectorStoreId ?? undefined;
  }

  static async setVectorStoreId(opportunityId: string, vectorStoreId: string): Promise<void> {
    await this.getOrCreateDossierRecord(opportunityId);
    await prisma.opportunityDossier.update({
      where: { opportunityId },
      data: { vectorStoreId },
    });
    logger.info({ opportunityId, vectorStoreId }, 'Dossier vector store assigned');
  }

  static async summarizeTextChunks(
    opportunityId: string,
    options: { maxChars?: number } = {},
  ): Promise<string | null> {
    const maxChars = options.maxChars ?? 2000;
    const chunks = await this.listTextChunks(opportunityId);
    if (!chunks.length) {
      return null;
    }

    const summary = chunks
      .map((chunk) => {
        const header = `[${chunk.sourceType.toUpperCase()}] ${chunk.title ?? 'Sin título'}`;
        return `${header}\n${chunk.content}`;
      })
      .join('\n\n');

    return summary.length > maxChars ? `${summary.slice(0, maxChars)}…` : summary;
  }

  /** Internal helper useful for tests */
  static async clearAll(): Promise<void> {
    await prisma.dossierFile.deleteMany();
    await prisma.dossierTextChunk.deleteMany();
    await prisma.opportunityDossier.deleteMany();
  }
}

