import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { LLMCache } from '../../domain/services/llmCache';
import { logger } from '../../lib/logger';

export const cacheRouter: ExpressRouter = Router();

// GET /api/cache/stats - Get cache statistics
cacheRouter.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = LLMCache.getStats();
    return res.json(stats);
  } catch (error) {
    logger.error({ error }, '[CacheRoute] Error getting cache stats');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cache - Clear all cache
cacheRouter.delete('/', (_req: Request, res: Response) => {
  try {
    LLMCache.clearAll();
    const cleared = LLMCache.clearExpired();
    return res.json({ 
      message: 'Cache cleared successfully',
      clearedEntries: cleared,
    });
  } catch (error) {
    logger.error({ error }, '[CacheRoute] Error clearing cache');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

