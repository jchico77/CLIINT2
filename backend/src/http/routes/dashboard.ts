import { Router, Request, Response } from 'express';
import { DashboardService } from '../../domain/services/dashboardService';
import { CreateDashboardInput } from '../../domain/models/clientIntelDashboard';
import { CreateDashboardInputSchema } from '../../domain/validators/dashboardValidators';
import { ValidationError, NotFoundError } from '../../domain/errors/AppError';

// Router for POST /api/vendors/:vendorId/dashboard
export const dashboardCreateRouter = Router();

// POST /api/vendors/:vendorId/dashboard - Generate dashboard with progress streaming
dashboardCreateRouter.post('/:vendorId/dashboard', async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    
    // Validate input with Zod
    const validationResult = CreateDashboardInputSchema.safeParse({
      ...req.body,
      vendorId,
    });

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

    const input: CreateDashboardInput = validationResult.data;

    // Check if client wants streaming progress
    const useStreaming = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

    if (useStreaming) {
      // Set streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.setHeader('Access-Control-Allow-Origin', '*'); // For CORS

      // Progress callback
      const onProgress = (event: { stepId: string; status: string; message?: string; progress?: number }) => {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (err) {
          console.error('Error writing progress event:', err);
        }
      };

      try {
        const dashboard = await DashboardService.generateDashboard(input, onProgress);
        
        // Send final result
        res.write(`data: ${JSON.stringify({ type: 'complete', dashboardId: dashboard.id, dashboard })}\n\n`);
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
        res.end();
      }
    } else {
      // Standard request without progress
      const dashboard = await DashboardService.generateDashboard(input);
      
      return res.status(201).json({
        dashboardId: dashboard.id,
        dashboard,
      });
    }
  } catch (error) {
    console.error('[DashboardRoute] Error generating dashboard:', error);
    
    // Handle specific error types
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
    
    // Generic error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isLLMError = errorMessage.includes('LLM') || errorMessage.includes('OpenAI') || errorMessage.includes('API');
    
    return res.status(500).json({
      error: isLLMError 
        ? 'Error during AI analysis. Please try again or check your API configuration.'
        : 'Internal server error',
      code: isLLMError ? 'LLM_ERROR' : 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
});

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
    console.error('Error getting dashboards:', error);
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
    console.error('Error getting dashboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

