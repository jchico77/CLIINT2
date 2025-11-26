import OpenAI from 'openai';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { llmConfig } from '../config/llm';
import { logger } from '../lib/logger';

const ensureClient = (): OpenAI => {
  if (!llmConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required to use File Search');
  }
  return new OpenAI({ apiKey: llmConfig.openaiApiKey });
};

export class FileSearchService {
  static async ensureVectorStore(
    opportunityId: string,
    existingId?: string,
  ): Promise<string | null> {
    if (existingId) {
      return existingId;
    }

    const client = ensureClient();
    const vectorStores = (client as any).beta?.vectorStores;
    if (!vectorStores) {
      logger.warn(
        { opportunityId },
        'Vector store API not available; skipping remote document indexing',
      );
      return null;
    }
    const vectorStore = await vectorStores.create({
      name: `dossier_${opportunityId}`,
    });

    logger.info(
      { opportunityId, vectorStoreId: vectorStore.id },
      'Created vector store for opportunity dossier',
    );
    return vectorStore.id;
  }

  static async uploadFileToVectorStore(params: {
    opportunityId: string;
    vectorStoreId: string;
    buffer: Buffer;
    filename: string;
  }): Promise<string | null> {
    const client = ensureClient();
    const vectorStoreFiles = (client as any).beta?.vectorStores?.files;
    if (!vectorStoreFiles) {
      logger.warn(
        { opportunityId: params.opportunityId },
        'Vector store files API not available; storing file locally only',
      );
      return null;
    }

    const tempPath = join(
      tmpdir(),
      `dossier-${params.opportunityId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${params.filename}`,
    );
    await fs.writeFile(tempPath, params.buffer);

    let uploadedFile: OpenAI.Files.FileObject;
    try {
      uploadedFile = await client.files.create({
        file: createReadStream(tempPath),
        purpose: 'assistants',
      });
    } finally {
      await fs.unlink(tempPath).catch(() => undefined);
    }

    await vectorStoreFiles.create(params.vectorStoreId, {
      file_id: uploadedFile.id,
    });

    logger.info(
      {
        opportunityId: params.opportunityId,
        vectorStoreId: params.vectorStoreId,
        fileId: uploadedFile.id,
      },
      'Uploaded dossier file to vector store',
    );

    return uploadedFile.id;
  }
}

