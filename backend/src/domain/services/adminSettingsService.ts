import { Prisma } from '@prisma/client';
import { AdminSettings } from '../models/adminSettings';
import { AdminSettingsSchema } from '../validators/adminSettingsValidator';
import { defaultAdminSettings } from '../../config/adminSettingsDefaults';
import { ValidationError } from '../errors/AppError';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

const SNAPSHOT_ID = 1;

export class AdminSettingsService {
  private static cache: AdminSettings = defaultAdminSettings;
  private static initialized = false;

  static getCachedSettings(): AdminSettings {
    return this.cache;
  }

  static async loadSettings(): Promise<AdminSettings> {
    if (this.initialized) {
      return this.cache;
    }

    const record = await prisma.adminSettingsSnapshot.findUnique({
      where: { id: SNAPSHOT_ID },
    });

    if (!record) {
      logger.info(
        '[AdminSettingsService] No snapshot found in DB. Initialising with defaults.',
      );
      await prisma.adminSettingsSnapshot.create({
        data: {
          id: SNAPSHOT_ID,
          settings: defaultAdminSettings as unknown as Prisma.InputJsonValue,
        },
      });
      this.cache = defaultAdminSettings;
      this.initialized = true;
      return this.cache;
    }

    const validation = AdminSettingsSchema.safeParse(record.settings);
    if (!validation.success) {
      logger.warn(
        { issues: validation.error.issues },
        '[AdminSettingsService] Invalid settings in DB. Reverting to defaults.',
      );
      await this.resetToDefaults();
      this.initialized = true;
      return this.cache;
    }

    this.cache = validation.data;
    this.initialized = true;
    logger.info('[AdminSettingsService] Settings loaded from database');
    return this.cache;
  }

  static async saveSettings(settings: AdminSettings): Promise<AdminSettings> {
    const validation = AdminSettingsSchema.safeParse(settings);
    if (!validation.success) {
      const details = {
        issues: validation.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
      logger.warn(details, '[AdminSettingsService] Validation failed while saving settings');
      throw new ValidationError('Invalid admin settings payload', details);
    }

    const payload = validation.data;
    await prisma.adminSettingsSnapshot.upsert({
      where: { id: SNAPSHOT_ID },
      create: {
        id: SNAPSHOT_ID,
        settings: payload as unknown as Prisma.InputJsonValue,
      },
      update: {
        settings: payload as unknown as Prisma.InputJsonValue,
      },
    });
    this.cache = payload;
    this.initialized = true;
    logger.info('[AdminSettingsService] Settings persisted in database');
    return this.cache;
  }

  static async resetToDefaults(): Promise<AdminSettings> {
    await prisma.adminSettingsSnapshot.upsert({
      where: { id: SNAPSHOT_ID },
      create: {
        id: SNAPSHOT_ID,
        settings: defaultAdminSettings as unknown as Prisma.InputJsonValue,
      },
      update: {
        settings: defaultAdminSettings as unknown as Prisma.InputJsonValue,
      },
    });
    this.cache = defaultAdminSettings;
    this.initialized = true;
    return this.cache;
  }
}