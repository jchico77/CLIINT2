import { Router, Request, Response } from 'express';
import { DashboardRunStatus } from '@prisma/client';
import { requireAdminAuth } from '../middleware/adminAuth';
import { DashboardMetricsQueryService } from '../../domain/services/dashboardMetricsQueryService';
import { logger } from '../../lib/logger';

const adminMetricsRouter = Router();

const parseDate = (value?: string): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isRunStatus = (value: string): value is DashboardRunStatus =>
  value === 'success' || value === 'error';

adminMetricsRouter.use(requireAdminAuth);

adminMetricsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 7);

    const fromParam = typeof req.query.from === 'string' ? req.query.from : undefined;
    const toParam = typeof req.query.to === 'string' ? req.query.to : undefined;
    const vendorId =
      typeof req.query.vendorId === 'string' && req.query.vendorId.length > 0
        ? req.query.vendorId
        : undefined;
    const model =
      typeof req.query.model === 'string' && req.query.model.length > 0
        ? req.query.model
        : undefined;
    const statusParam =
      typeof req.query.status === 'string' && req.query.status.length > 0
        ? req.query.status
        : undefined;

    const parsedFrom = fromParam ? parseDate(fromParam) : defaultFrom;
    const parsedTo = toParam ? parseDate(toParam) : now;

    if (fromParam && !parsedFrom) {
      return res.status(400).json({
        error: 'Invalid `from` date. Use ISO format (YYYY-MM-DD).',
        code: 'INVALID_DATE_FROM',
      });
    }

    if (toParam && !parsedTo) {
      return res.status(400).json({
        error: 'Invalid `to` date. Use ISO format (YYYY-MM-DD).',
        code: 'INVALID_DATE_TO',
      });
    }

    let runStatus: DashboardRunStatus | undefined;
    if (statusParam) {
      if (!isRunStatus(statusParam)) {
        return res.status(400).json({
          error: 'Invalid status. Use `success` o `error`.',
          code: 'INVALID_STATUS',
        });
      }
      runStatus = statusParam;
    }

    const metrics = await DashboardMetricsQueryService.getMetrics({
      from: parsedFrom ?? undefined,
      to: parsedTo ?? undefined,
      vendorId,
      model,
      status: runStatus,
    });

    return res.json(metrics);
  } catch (error) {
    logger.error({ error }, '[AdminMetricsRoute] Failed to fetch metrics');
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

export { adminMetricsRouter };


