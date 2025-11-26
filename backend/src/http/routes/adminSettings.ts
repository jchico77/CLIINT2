import { Router, Request, Response } from 'express';
import { AdminSettingsService } from '../../domain/services/adminSettingsService';
import { requireAdminAuth } from '../middleware/adminAuth';
import { logger } from '../../lib/logger';
import { ValidationError } from '../../domain/errors/AppError';
import { applyAdminSettings } from '../../config/llm';

export const adminSettingsRouter = Router();

const handleError = (error: unknown, res: Response) => {
  if (error instanceof ValidationError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  logger.error({ error }, '[AdminSettingsRoute] Unexpected error');
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

adminSettingsRouter.get(
  '/settings',
  requireAdminAuth,
  async (_req: Request, res: Response) => {
    try {
      const settings = await AdminSettingsService.loadSettings();
      return res.json(settings);
    } catch (error) {
      return handleError(error, res);
    }
  },
);

adminSettingsRouter.put('/settings', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const updated = await AdminSettingsService.saveSettings(req.body);
    applyAdminSettings(updated);
    return res.json(updated);
  } catch (error) {
    return handleError(error, res);
  }
});

adminSettingsRouter.post(
  '/settings/reset',
  requireAdminAuth,
  async (_req: Request, res: Response) => {
    try {
      const settings = await AdminSettingsService.resetToDefaults();
      applyAdminSettings(settings);
      return res.status(200).json(settings);
    } catch (error) {
      return handleError(error, res);
    }
  },
);

