import { Router, Request, Response } from 'express';
import { LLMCache } from '../../domain/services/llmCache';

export const cacheRouter = Router();

// GET /api/cache/stats - Get cache statistics
cacheRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = LLMCache.getStats();
    return res.json(stats);
  } catch (error) {
    console.error('[CacheRoute] Error getting cache stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cache - Clear all cache
cacheRouter.delete('/', (req: Request, res: Response) => {
  try {
    LLMCache.clearAll();
    const cleared = LLMCache.clearExpired();
    return res.json({ 
      message: 'Cache cleared successfully',
      clearedEntries: cleared,
    });
  } catch (error) {
    console.error('[CacheRoute] Error clearing cache:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

