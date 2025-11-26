import { Prisma, DashboardPhaseType, DashboardPhaseStatus, DashboardRunStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const toJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
};

export interface RunHandle {
  id: string;
  startedAt: Date;
}

export interface PhaseHandle {
  id: string;
  startedAt: Date;
}

interface StartRunInput {
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityId?: string;
  llmModelUsed?: string;
  configSnapshot?: unknown;
  featureToggles?: unknown;
}

interface FinishRunInput {
  status: DashboardRunStatus;
  errorMessage?: string;
  llmModelUsed?: string;
}

interface StartPhaseInput {
  runId: string;
  phase: DashboardPhaseType;
  model?: string;
  reasoningEffort?: string;
  cacheMode?: string;
  featureToggles?: unknown;
  metadata?: Record<string, unknown>;
}

interface FinishPhaseInput {
  status: DashboardPhaseStatus;
  errorMessage?: string;
}

export class DashboardMetricsService {
  private static handlePersistenceError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      const message =
        'Las tablas de métricas no existen. Ejecuta "pnpm prisma migrate deploy" antes de volver a generar dashboards.';
      logger.error({ action, code: error.code }, message);
      throw new Error(message);
    }
    logger.error({ action, error }, 'Dashboard metrics persistence failed');
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Dashboard metrics ${action} failed`);
  }

  static async startRun(input: StartRunInput): Promise<RunHandle> {
    try {
      const run = await prisma.dashboardGenerationRun.create({
        data: {
          vendorId: input.vendorId,
          clientId: input.clientId,
          serviceOfferingId: input.serviceOfferingId,
          opportunityId: input.opportunityId,
          llmModelUsed: input.llmModelUsed,
          config: toJsonValue(input.configSnapshot),
          featureToggles: toJsonValue(input.featureToggles),
        },
        select: { id: true, startedAt: true },
      });

      logger.debug({ runId: run.id }, 'Dashboard metrics run started');
      return run;
    } catch (error) {
      this.handlePersistenceError(error, 'startRun');
    }
  }

  static async finishRun(handle: RunHandle | null, input: FinishRunInput): Promise<void> {
    if (!handle) {
      return;
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - handle.startedAt.getTime();

    try {
      await prisma.dashboardGenerationRun.update({
        where: { id: handle.id },
        data: {
          status: input.status,
          errorMessage: input.errorMessage,
          finishedAt,
          durationMs,
          llmModelUsed: input.llmModelUsed ?? undefined,
        },
      });

      logger.debug({ runId: handle.id, status: input.status }, 'Dashboard metrics run finished');
    } catch (error) {
      this.handlePersistenceError(error, 'finishRun');
    }
  }

  static async startPhase(input: StartPhaseInput): Promise<PhaseHandle> {
    try {
      const phase = await prisma.dashboardPhaseMetric.create({
        data: {
          runId: input.runId,
          phase: input.phase,
          model: input.model,
          reasoningEffort: input.reasoningEffort,
          cacheMode: input.cacheMode,
          featureToggles: toJsonValue(input.featureToggles),
          metadata: toJsonValue(input.metadata),
        },
        select: { id: true, startedAt: true },
      });

      logger.debug({ runId: input.runId, phase: input.phase }, 'Dashboard metrics phase started');
      return phase;
    } catch (error) {
      this.handlePersistenceError(error, 'startPhase');
    }
  }

  static async finishPhase(handle: PhaseHandle | null, input: FinishPhaseInput): Promise<void> {
    if (!handle) {
      return;
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - handle.startedAt.getTime();

    try {
      await prisma.dashboardPhaseMetric.update({
        where: { id: handle.id },
        data: {
          status: input.status,
          errorMessage: input.errorMessage,
          finishedAt,
          durationMs,
        },
      });

      logger.debug(
        { phaseId: handle.id, status: input.status },
        'Dashboard metrics phase finished',
      );
    } catch (error) {
      this.handlePersistenceError(error, 'finishPhase');
    }
  }
}


