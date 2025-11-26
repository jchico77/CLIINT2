import { logger } from '../lib/logger';

export type DashboardPhase =
  | 'deepResearch'
  | 'clientResearch'
  | 'vendorResearch'
  | 'fitStrategy'
  | 'proposalOutline';

interface PhaseContext {
  vendorId?: string;
  clientId?: string;
  serviceId?: string;
  opportunityId?: string;
  model?: string;
  reasoningEffort?: string;
  cacheMode?: string;
  cacheHit?: boolean;
  usesWebSearch?: boolean;
  usesFileSearch?: boolean;
  source?: 'dashboardService' | 'agent';
  cacheSource?: 'db' | 'fs';
  [key: string]: unknown;
}

export const logPhaseStart = (
  phase: DashboardPhase,
  context: PhaseContext,
  message = 'LLM phase start',
): void => {
  logger.info({ phase, ...context }, message);
};

export const logPhaseCacheStatus = (
  phase: DashboardPhase,
  context: PhaseContext,
  message = 'LLM phase cache status',
): void => {
  logger.info({ phase, ...context }, message);
};


