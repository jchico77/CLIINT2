import {
  DashboardPhaseStatus,
  DashboardPhaseType,
  DashboardRunStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface DashboardMetricsFilters {
  from?: Date;
  to?: Date;
  vendorId?: string;
  clientId?: string;
  model?: string;
  status?: DashboardRunStatus;
}

export interface DashboardMetricsResponse {
  summary: {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number | null;
    from: string | null;
    to: string | null;
  };
  models: Array<{
    model: string;
    totalRuns: number;
    avgDurationMs: number | null;
  }>;
  phases: Array<{
    phase: DashboardPhaseType;
    executions: number;
    avgDurationMs: number | null;
    maxDurationMs: number | null;
    p95DurationMs: number | null;
  }>;
  recentRuns: Array<{
    id: string;
    vendorId: string;
    clientId: string;
    serviceOfferingId: string;
    opportunityId: string | null;
    status: DashboardRunStatus;
    llmModelUsed: string | null;
    durationMs: number | null;
    startedAt: string;
    finishedAt: string | null;
    errorMessage: string | null;
    phases: Array<{
      id: string;
      phase: DashboardPhaseType;
      status: DashboardPhaseStatus;
      durationMs: number | null;
      startedAt: string;
      finishedAt: string | null;
      errorMessage: string | null;
    }>;
  }>;
  filters: {
    vendorId?: string;
    model?: string;
    status?: DashboardRunStatus;
    from: string | null;
    to: string | null;
  };
}

const toISOStringOrNull = (date?: Date): string | null =>
  date ? date.toISOString() : null;

const percentile = (samples: number[], percentileValue: number): number | null => {
  if (samples.length === 0) {
    return null;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentileValue * sorted.length) - 1),
  );
  return sorted[index];
};

export class DashboardMetricsQueryService {
  static async getMetrics(
    filters: DashboardMetricsFilters,
  ): Promise<DashboardMetricsResponse> {
    const runWhere: Prisma.DashboardGenerationRunWhereInput = {};

    if (filters.vendorId) {
      runWhere.vendorId = filters.vendorId;
    }
    if (filters.clientId) {
      runWhere.clientId = filters.clientId;
    }
    if (filters.model) {
      runWhere.llmModelUsed = filters.model;
    }
    if (filters.status) {
      runWhere.status = filters.status;
    }
    if (filters.from || filters.to) {
      runWhere.startedAt = {};
      if (filters.from) {
        runWhere.startedAt.gte = filters.from;
      }
      if (filters.to) {
        runWhere.startedAt.lte = filters.to;
      }
    }

    const [
      runs,
      totalRuns,
      successRuns,
      avgRunDuration,
      modelGroups,
      phaseGroups,
      phaseSamples,
    ] = await Promise.all([
      prisma.dashboardGenerationRun.findMany({
        where: runWhere,
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: {
          phases: {
            orderBy: { startedAt: 'asc' },
            select: {
              id: true,
              phase: true,
              status: true,
              durationMs: true,
              errorMessage: true,
              startedAt: true,
              finishedAt: true,
            },
          },
        },
      }),
      prisma.dashboardGenerationRun.count({ where: runWhere }),
      prisma.dashboardGenerationRun.count({
        where: {
          ...runWhere,
          status: DashboardRunStatus.success,
        },
      }),
      prisma.dashboardGenerationRun.aggregate({
        where: runWhere,
        _avg: { durationMs: true },
      }),
      prisma.dashboardGenerationRun.groupBy({
        by: ['llmModelUsed'],
        where: runWhere,
        _avg: { durationMs: true },
        _count: { _all: true },
      }),
      prisma.dashboardPhaseMetric.groupBy({
        by: ['phase'],
        where: {
          run: runWhere,
          status: DashboardPhaseStatus.success,
        },
        _avg: { durationMs: true },
        _max: { durationMs: true },
        _count: { _all: true },
      }),
      prisma.dashboardPhaseMetric.findMany({
        where: {
          run: runWhere,
          status: DashboardPhaseStatus.success,
        },
        select: {
          phase: true,
          durationMs: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    const samplesByPhase = new Map<DashboardPhaseType, number[]>();
    phaseSamples.forEach((sample) => {
      if (typeof sample.durationMs !== 'number') {
        return;
      }
      if (!samplesByPhase.has(sample.phase)) {
        samplesByPhase.set(sample.phase, []);
      }
      samplesByPhase.get(sample.phase)?.push(sample.durationMs);
    });

    const p95ByPhase = new Map<DashboardPhaseType, number | null>();
    samplesByPhase.forEach((values, phase) => {
      p95ByPhase.set(phase, percentile(values, 0.95));
    });

    return {
      summary: {
        totalRuns,
        successRate: totalRuns === 0 ? 0 : successRuns / totalRuns,
        avgDurationMs: avgRunDuration._avg.durationMs ?? null,
        from: toISOStringOrNull(filters.from),
        to: toISOStringOrNull(filters.to),
      },
      models: modelGroups
        .map((group) => ({
          model: group.llmModelUsed ?? 'desconocido',
          totalRuns: group._count._all,
          avgDurationMs: group._avg.durationMs ?? null,
        }))
        .sort((a, b) => b.totalRuns - a.totalRuns),
      phases: phaseGroups.map((group) => ({
        phase: group.phase,
        executions: group._count._all,
        avgDurationMs: group._avg.durationMs ?? null,
        maxDurationMs: group._max.durationMs ?? null,
        p95DurationMs: p95ByPhase.get(group.phase) ?? null,
      })),
      recentRuns: runs.map((run) => ({
        id: run.id,
        vendorId: run.vendorId,
        clientId: run.clientId,
        serviceOfferingId: run.serviceOfferingId,
        opportunityId: run.opportunityId,
        status: run.status,
        llmModelUsed: run.llmModelUsed ?? null,
        durationMs: run.durationMs ?? null,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
        errorMessage: run.errorMessage ?? null,
        phases: run.phases.map((phase) => ({
          id: phase.id,
          phase: phase.phase,
          status: phase.status,
          durationMs: phase.durationMs ?? null,
          startedAt: phase.startedAt.toISOString(),
          finishedAt: phase.finishedAt ? phase.finishedAt.toISOString() : null,
          errorMessage: phase.errorMessage ?? null,
        })),
      })),
      filters: {
        vendorId: filters.vendorId,
        model: filters.model,
        status: filters.status,
        from: toISOStringOrNull(filters.from),
        to: toISOStringOrNull(filters.to),
      },
    };
  }
}


