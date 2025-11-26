import { PhaseCacheStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { DashboardPhase } from '../../llm/phaseLogger';

export class DashboardPhaseCacheService {
  static async getPhase<T>(
    opportunityId: string | undefined,
    phase: DashboardPhase,
  ): Promise<T | null> {
    if (!opportunityId) {
      return null;
    }

    const record = await prisma.dashboardPhaseCache.findUnique({
      where: {
        opportunityId_phase: {
          opportunityId,
          phase,
        },
      },
    });

    if (!record || record.status !== PhaseCacheStatus.success) {
      return null;
    }

    return record.payload as T;
  }

  static async savePhase(
    opportunityId: string | undefined,
    phase: DashboardPhase,
    payload: unknown,
  ): Promise<void> {
    if (!opportunityId) {
      return;
    }

    await prisma.dashboardPhaseCache.upsert({
      where: {
        opportunityId_phase: {
          opportunityId,
          phase,
        },
      },
      create: {
        opportunityId,
        phase,
        payload: payload as Prisma.InputJsonValue,
        status: PhaseCacheStatus.success,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
        status: PhaseCacheStatus.success,
        errorMessage: null,
      },
    });
  }

  static async markError(
    opportunityId: string | undefined,
    phase: DashboardPhase,
    errorMessage: string,
  ): Promise<void> {
    if (!opportunityId) {
      return;
    }

    await prisma.dashboardPhaseCache.upsert({
      where: {
        opportunityId_phase: {
          opportunityId,
          phase,
        },
      },
      create: {
        opportunityId,
        phase,
        payload: {} as Prisma.InputJsonValue,
        status: PhaseCacheStatus.error,
        errorMessage,
      },
      update: {
        status: PhaseCacheStatus.error,
        errorMessage,
      },
    });
  }

  static async clearPhase(opportunityId: string, phase: DashboardPhase): Promise<void> {
    await prisma.dashboardPhaseCache.deleteMany({
      where: { opportunityId, phase },
    });
  }
}


