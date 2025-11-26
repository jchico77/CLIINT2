import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

let warnedAboutMissingToken = false;

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  if (!env.ADMIN_API_TOKEN) {
    if (!warnedAboutMissingToken) {
      logger.warn(
        '[AdminAuth] ADMIN_API_TOKEN not configured. Admin endpoints are unprotected.',
      );
      warnedAboutMissingToken = true;
    }
    return next();
  }

  const headerToken = req.header('x-admin-token') || req.header('authorization');
  if (!headerToken) {
    return res.status(401).json({
      error: 'Admin authentication required',
      code: 'UNAUTHORIZED',
    });
  }

  const normalizedHeader = headerToken.startsWith('Bearer ')
    ? headerToken.slice(7)
    : headerToken;

  if (normalizedHeader !== env.ADMIN_API_TOKEN) {
    logger.warn('[AdminAuth] Invalid admin token attempt detected');
    return res.status(401).json({
      error: 'Invalid admin token',
      code: 'UNAUTHORIZED',
    });
  }

  return next();
}

