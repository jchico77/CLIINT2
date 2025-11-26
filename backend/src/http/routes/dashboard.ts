import { Router, Request, Response } from 'express';
import { DashboardService } from '../../domain/services/dashboardService';
import { CreateOpportunityDashboardInput } from '../../domain/models/clientIntelDashboard';
import { CreateOpportunityDashboardInputSchema } from '../../domain/validators/dashboardValidators';
import { ValidationError, NotFoundError } from '../../domain/errors/AppError';
import { logger } from '../../lib/logger';

// Router for POST /api/vendors/:vendorId/dashboard
export const dashboardCreateRouter = Router();

// POST /api/vendors/:vendorId/dashboard (legacy - disabled)
dashboardCreateRouter.post('/:vendorId/dashboard', (_req: Request, res: Response) => {
  return res.status(410).json({
    error: 'Este endpoint ha sido reemplazado. Usa /api/vendors/:vendorId/opportunities/:opportunityId/dashboard',
    code: 'LEGACY_ENDPOINT',
  });
});

const streamProgress = (
  res: Response,
  handler: (onProgress: (event: { stepId: string; status: string; message?: string; progress?: number }) => void) => Promise<unknown>
) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const onProgress = (event: { stepId: string; status: string; message?: string; progress?: number }) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      logger.error({ err }, 'Error writing progress SSE event');
    }
  };

  handler(onProgress)
    .then((result) => {
      if (result && typeof result === 'object' && 'dashboard' in (result as Record<string, unknown>)) {
        const { dashboardId, dashboard } = result as { dashboardId: string; dashboard: unknown };
        res.write(`data: ${JSON.stringify({ type: 'complete', dashboardId, dashboard })}\n\n`);
      }
      res.end();
    })
    .catch((error) => {
      logger.error({ error }, 'Dashboard generation failed during streaming');
      res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
    });
};

const handleDashboardError = (error: unknown, res: Response) => {
  logger.error({ error }, '[DashboardRoute] Error generating dashboard');

  if (error instanceof ValidationError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  const isLLMError = errorMessage.includes('LLM') || errorMessage.includes('OpenAI') || errorMessage.includes('API');

  return res.status(500).json({
    error: isLLMError
      ? 'Error durante el análisis de IA. Comprueba la configuración del modelo.'
      : 'Internal server error',
    code: isLLMError ? 'LLM_ERROR' : 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
  });
};

dashboardCreateRouter.post(
  '/:vendorId/opportunities/:opportunityId/dashboard',
  async (req: Request, res: Response) => {
    try {
      const { vendorId, opportunityId } = req.params;
      const validationResult = CreateOpportunityDashboardInputSchema.safeParse(req.body ?? {});

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        });
      }

      const body = validationResult.data;
      const input: CreateOpportunityDashboardInput = {
        vendorId,
        opportunityId,
        opportunityContextOverride: body.opportunityContextOverride,
        uploadedDocIds: body.uploadedDocIds,
      };

      const useStreaming =
        req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

      if (useStreaming) {
        return streamProgress(res, async (onProgress) => {
          const dashboard = await DashboardService.generateDashboardForOpportunity(
            input,
            onProgress
          );
          return { dashboardId: dashboard.id, dashboard };
        });
      }

      const dashboard = await DashboardService.generateDashboardForOpportunity(input);
      return res.status(201).json({
        dashboardId: dashboard.id,
        dashboard,
      });
    } catch (error) {
      return handleDashboardError(error, res);
    }
  }
);

// Router for GET /api/dashboard/:dashboardId and GET /api/dashboards
export const dashboardGetRouter = Router();

// GET /api/dashboards - List all dashboards
dashboardGetRouter.get('/dashboards', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.query;
    
    let dashboards;
    if (vendorId && typeof vendorId === 'string') {
      dashboards = DashboardService.getByVendorId(vendorId);
    } else {
      dashboards = DashboardService.getAll();
    }

    // Return summary info only (not full dashboard data)
    const summaries = dashboards.map((d) => ({
      id: d.id,
      vendorId: d.vendorId,
      clientId: d.clientId,
      serviceOfferingId: d.serviceOfferingId,
      opportunityId: d.opportunityId,
      opportunityStage: d.opportunityStage,
      opportunityName: d.opportunityName,
      clientName: d.sections.accountSnapshot.companyName,
      industry: d.sections.accountSnapshot.industry,
      opportunityBrief: d.sections.opportunitySummary?.opportunityBrief || d.opportunityContext.substring(0, 150) + '...',
      fitScore: d.sections.vendorFitAndPlays.fitScore,
      overallFit: d.sections.vendorFitAndPlays.overallFit,
      generatedAt: d.generatedAt,
      llmModelUsed: d.llmModelUsed,
    }));

    return res.json({ dashboards: summaries });
  } catch (error) {
    logger.error({ error }, 'Error getting dashboards');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/:dashboardId - Get single dashboard
dashboardGetRouter.get('/dashboard/:dashboardId', (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const dashboard = DashboardService.getById(dashboardId);

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    return res.json(dashboard);
  } catch (error) {
    logger.error({ error }, 'Error getting dashboard');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

