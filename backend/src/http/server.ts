import express from 'express';
import cors from 'cors';
import { env } from '../config/env';
import healthRouter from './routes/health';
import vendorsRouter from './routes/vendors';
import clientsRouter from './routes/clients';
import servicesRouter from './routes/services';
import { dashboardCreateRouter, dashboardGetRouter } from './routes/dashboard';
import { cacheRouter } from './routes/cache';
import { vendorOpportunitiesRouter, opportunityRouter } from './routes/opportunities';
import { opportunityDossierRouter } from './routes/opportunityDossier';
import { adminSettingsRouter } from './routes/adminSettings';
import { adminMetricsRouter } from './routes/adminMetrics';
import { logger } from '../lib/logger';
import { AdminSettingsService } from '../domain/services/adminSettingsService';
import { applyAdminSettings } from '../config/llm';

const app = express();

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/vendors/:vendorId/clients', clientsRouter);
app.use('/api/vendors/:vendorId/services', servicesRouter);
// Additional routes for direct access
app.use('/api/clients', clientsRouter);
app.use('/api/services', servicesRouter);
// Dashboard routes
app.use('/api/vendors', dashboardCreateRouter); // POST /api/vendors/:vendorId/dashboard
app.use('/api', dashboardGetRouter); // GET /api/dashboard/:dashboardId
// Opportunities routes
app.use('/api/vendors/:vendorId/opportunities', vendorOpportunitiesRouter);
app.use('/api/opportunities', opportunityRouter);
app.use('/api/opportunities', opportunityDossierRouter);
// Cache routes
app.use('/api/cache', cacheRouter); // GET /api/cache/stats, DELETE /api/cache
// Admin routes
app.use('/api/admin/metrics', adminMetricsRouter);
app.use('/api/admin', adminSettingsRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  
  // Check if it's an AppError with status code
  if ('statusCode' in err && typeof (err as { statusCode: number }).statusCode === 'number') {
    const appError = err as { statusCode: number; code?: string; details?: unknown };
    return res.status(appError.statusCode).json({
      error: err.message,
      code: appError.code || 'INTERNAL_ERROR',
      details: appError.details,
    });
  }
  
  return res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = parseInt(env.PORT, 10);

const bootstrap = async () => {
  try {
    const settings = await AdminSettingsService.loadSettings();
    applyAdminSettings(settings);
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server running');
      logger.info({ url: `http://localhost:${PORT}/api/health` }, 'Health check available');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to bootstrap server');
    process.exit(1);
  }
};

void bootstrap();

