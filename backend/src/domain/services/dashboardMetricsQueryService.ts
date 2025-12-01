import {
  DashboardPhaseStatus,
  DashboardPhaseType,
  DashboardRunStatus,
  Prisma,
  VendorDeepResearchStatus,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  VendorDeepResearchPhaseCategory,
  VendorDeepResearchSubPhaseId,
  vendorDeepResearchPhaseCatalog,
  vendorDeepResearchPhaseLabels,
  vendorDeepResearchPhaseOrder,
  vendorDeepResearchSubPhaseOrder,
} from '../models/vendorDeepResearchPhases';

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
  vendorDeepResearch: {
    summary: {
      totalAnalyses: number;
      completed: number;
      failed: number;
      avgDurationMs: number | null;
    };
    models: Array<{
      model: string;
      totalAnalyses: number;
      avgDurationMs: number | null;
    }>;
    recent: Array<{
      id: string;
      vendorId: string;
      vendorName: string;
      status: VendorDeepResearchStatus;
      llmModelUsed: string | null;
      durationMs: number | null;
      startedAt: string | null;
      completedAt: string | null;
      errorMessage: string | null;
      analysisId: string | null;
    }>;
    timings: {
      phases: Array<{
        phase: VendorDeepResearchPhaseCategory;
        phaseLabel: string;
        avgDurationMs: number | null;
        samples: number;
        subPhases: Array<{
          subPhase: VendorDeepResearchSubPhaseId;
          subPhaseLabel: string;
          avgDurationMs: number | null;
          samples: number;
        }>;
      }>;
    };
    recentPhaseRuns: Array<{
      analysisId: string;
      vendorId: string;
      vendorName: string;
      llmModelUsed: string | null;
      status: VendorDeepResearchStatus;
      completedAt: string | null;
      phases: Array<{
        phase: VendorDeepResearchPhaseCategory;
        phaseLabel: string;
        subPhases: Array<{
          subPhase: VendorDeepResearchSubPhaseId;
          subPhaseLabel: string;
          durationMs: number | null;
        }>;
      }>;
    }>;
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

const vendorPhaseSet = new Set(vendorDeepResearchPhaseOrder);
const vendorSubPhaseSet = new Set(vendorDeepResearchSubPhaseOrder);

const isVendorPhaseCategory = (value: string): value is VendorDeepResearchPhaseCategory =>
  vendorPhaseSet.has(value as VendorDeepResearchPhaseCategory);

const isVendorSubPhaseId = (value: string): value is VendorDeepResearchSubPhaseId =>
  vendorSubPhaseSet.has(value as VendorDeepResearchSubPhaseId);

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

    const vendorWhere: Prisma.VendorDeepResearchReportWhereInput = {};
    const vendorPhaseMetricWhere: Prisma.VendorDeepResearchPhaseMetricWhereInput =
      {};

    if (filters.vendorId) {
      vendorWhere.vendorId = filters.vendorId;
      vendorPhaseMetricWhere.vendorId = filters.vendorId;
    }
    if (filters.model) {
      vendorWhere.llmModelUsed = filters.model;
    }
    if (filters.from || filters.to) {
      vendorWhere.startedAt = {};
      vendorPhaseMetricWhere.analysisStartedAt = {};
      if (filters.from) {
        vendorWhere.startedAt.gte = filters.from;
        vendorPhaseMetricWhere.analysisStartedAt.gte = filters.from;
      }
      if (filters.to) {
        vendorWhere.startedAt.lte = filters.to;
        vendorPhaseMetricWhere.analysisStartedAt.lte = filters.to;
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
      vendorReports,
      totalVendorAnalyses,
      completedVendorAnalyses,
      failedVendorAnalyses,
      vendorCompletedSamples,
      vendorPhaseSubPhaseGroups,
      vendorPhaseRunGroups,
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
      prisma.vendorDeepResearchReport.findMany({
        where: vendorWhere,
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.vendorDeepResearchReport.count({ where: vendorWhere }),
      prisma.vendorDeepResearchReport.count({
        where: {
          ...vendorWhere,
          status: VendorDeepResearchStatus.COMPLETED,
        },
      }),
      prisma.vendorDeepResearchReport.count({
        where: {
          ...vendorWhere,
          status: VendorDeepResearchStatus.FAILED,
        },
      }),
      prisma.vendorDeepResearchReport.findMany({
        where: {
          ...vendorWhere,
          status: VendorDeepResearchStatus.COMPLETED,
        },
        select: {
          llmModelUsed: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.vendorDeepResearchPhaseMetric.groupBy({
        by: ['phase', 'subPhase'],
        where: vendorPhaseMetricWhere,
        _avg: { durationMs: true },
        _count: { _all: true },
      }),
      prisma.vendorDeepResearchPhaseMetric.groupBy({
        by: ['phase', 'analysisId'],
        where: vendorPhaseMetricWhere,
        _sum: { durationMs: true },
      }),
    ]);

    const samplesByPhase = new Map<DashboardPhaseType, number[]>();
    (
      phaseSamples as Array<{ phase: DashboardPhaseType; durationMs: number | null }>
    ).forEach((sample) => {
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

    const vendorModelStats = new Map<
      string,
      { total: number; completed: number; durationSum: number }
    >();
    let vendorDurationSum = 0;
    let vendorDurationCount = 0;

    (
      vendorCompletedSamples as Array<{
        llmModelUsed: string | null;
        startedAt: Date | null;
        completedAt: Date | null;
      }>
    ).forEach((sample) => {
      if (!sample.startedAt || !sample.completedAt) {
        return;
      }
      const durationMs = sample.completedAt.getTime() - sample.startedAt.getTime();
      vendorDurationSum += durationMs;
      vendorDurationCount += 1;

      const key = sample.llmModelUsed ?? 'desconocido';
      if (!vendorModelStats.has(key)) {
        vendorModelStats.set(key, { total: 0, completed: 0, durationSum: 0 });
      }
      const stats = vendorModelStats.get(key)!;
      stats.total += 1;
      stats.completed += 1;
      stats.durationSum += durationMs;
    });

    const vendorModels = Array.from(vendorModelStats.entries()).map(([model, stats]) => ({
      model,
      totalAnalyses: stats.total,
      avgDurationMs: stats.completed > 0 ? stats.durationSum / stats.completed : null,
    }));

    const vendorRecent = (vendorReports as Array<
      Prisma.VendorDeepResearchReportGetPayload<{ include: { vendor: true } }>
    >).map((record) => {
      const durationMs =
        record.startedAt && record.completedAt
          ? record.completedAt.getTime() - record.startedAt.getTime()
          : null;
      return {
        id: record.id,
        vendorId: record.vendorId,
        vendorName: record.vendor?.name ?? record.vendorId,
        status: record.status,
        llmModelUsed: record.llmModelUsed ?? null,
        durationMs,
        startedAt: record.startedAt ? record.startedAt.toISOString() : null,
        completedAt: record.completedAt ? record.completedAt.toISOString() : null,
        errorMessage: record.errorMessage ?? null,
        analysisId: record.analysisId ?? null,
      };
    });

    const vendorPhaseSubPhaseStats = new Map<
      VendorDeepResearchPhaseCategory,
      Map<
        VendorDeepResearchSubPhaseId,
        {
          subPhase: VendorDeepResearchSubPhaseId;
          subPhaseLabel: string;
          avgDurationMs: number | null;
          samples: number;
        }
      >
    >();

    (
      vendorPhaseSubPhaseGroups as Array<{
        phase: string | null;
        subPhase: string | null;
        _avg: { durationMs: number | null };
        _count: { _all: number };
      }>
    ).forEach((group) => {
      if (!group.subPhase || !isVendorSubPhaseId(group.subPhase)) {
        return;
      }
      const catalogEntry = vendorDeepResearchPhaseCatalog[group.subPhase];
      const phaseKey = catalogEntry.phase;
      if (!vendorPhaseSubPhaseStats.has(phaseKey)) {
        vendorPhaseSubPhaseStats.set(phaseKey, new Map());
      }
      vendorPhaseSubPhaseStats
        .get(phaseKey)!
        .set(group.subPhase, {
          subPhase: group.subPhase,
          subPhaseLabel: catalogEntry.subPhaseLabel,
          avgDurationMs: group._avg.durationMs ?? null,
          samples: group._count._all,
        });
    });

    const vendorPhaseDurationSamples = new Map<VendorDeepResearchPhaseCategory, number[]>();
    (
      vendorPhaseRunGroups as Array<{
        phase: string | null;
        analysisId: string;
        _sum: { durationMs: number | null };
      }>
    ).forEach((group) => {
      if (!group.phase || !isVendorPhaseCategory(group.phase)) {
        return;
      }
      const totalDuration = group._sum.durationMs;
      if (typeof totalDuration !== 'number') {
        return;
      }
      if (!vendorPhaseDurationSamples.has(group.phase)) {
        vendorPhaseDurationSamples.set(group.phase, []);
      }
      vendorPhaseDurationSamples.get(group.phase)!.push(totalDuration);
    });

    const vendorTimingPhases = vendorDeepResearchPhaseOrder
      .map((phaseKey) => {
        const orderedSubPhases = vendorDeepResearchSubPhaseOrder
          .filter((subPhaseId) => vendorDeepResearchPhaseCatalog[subPhaseId].phase === phaseKey)
          .map((subPhaseId) => vendorPhaseSubPhaseStats.get(phaseKey)?.get(subPhaseId))
          .filter(
            (subPhase): subPhase is { subPhase: VendorDeepResearchSubPhaseId; subPhaseLabel: string; avgDurationMs: number | null; samples: number } =>
              Boolean(subPhase),
          );

        const phaseSamples = vendorPhaseDurationSamples.get(phaseKey) ?? [];
        const avgDurationMs =
          phaseSamples.length > 0
            ? phaseSamples.reduce((acc, value) => acc + value, 0) / phaseSamples.length
            : null;

        return {
          phase: phaseKey,
          phaseLabel: vendorDeepResearchPhaseLabels[phaseKey],
          avgDurationMs,
          samples: phaseSamples.length,
          subPhases: orderedSubPhases,
        };
      })
      .filter((phase) => phase.subPhases.length > 0);

    logger.info(
      {
        recentVendors: vendorRecent.map((item) => ({
          vendorId: item.vendorId,
          analysisId: item.analysisId,
        })),
      },
      '[DashboardMetrics] Vendor recent records snapshot',
    );

    const recentPhaseCandidates = vendorRecent
      .filter(
        (run): run is (typeof vendorRecent)[number] & { analysisId: string } =>
          typeof run.analysisId === 'string' && run.analysisId.length > 0,
      )
      .sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    let recentPhaseMetrics: Array<{
      analysisId: string;
      phase: string | null;
      subPhase: string | null;
      durationMs: number | null;
    }> = [];

    if (recentPhaseCandidates.length > 0) {
      recentPhaseMetrics = await prisma.vendorDeepResearchPhaseMetric.findMany({
        where: {
          analysisId: { in: recentPhaseCandidates.map((run) => run.analysisId) },
        },
        select: {
          analysisId: true,
          phase: true,
          subPhase: true,
          durationMs: true,
        },
      });
    }

    logger.info(
      {
        recentPhaseCandidates: recentPhaseCandidates.length,
        recentPhaseMetrics: recentPhaseMetrics.length,
      },
      '[DashboardMetrics] Vendor phase metrics snapshot',
    );

    const metricsByAnalysis = new Map<
      string,
      Array<{ subPhase: VendorDeepResearchSubPhaseId; durationMs: number | null }>
    >();

    recentPhaseMetrics.forEach((metric) => {
      if (!metric.analysisId || !metric.subPhase || !isVendorSubPhaseId(metric.subPhase)) {
        return;
      }
      if (!metricsByAnalysis.has(metric.analysisId)) {
        metricsByAnalysis.set(metric.analysisId, []);
      }
      metricsByAnalysis.get(metric.analysisId)!.push({
        subPhase: metric.subPhase,
        durationMs: metric.durationMs ?? null,
      });
    });

    const vendorRecentPhaseRuns = recentPhaseCandidates
      .map((run) => {
        const subPhaseMetrics = metricsByAnalysis.get(run.analysisId) ?? [];
        if (subPhaseMetrics.length === 0) {
          logger.warn(
            {
              vendorId: run.vendorId,
              analysisId: run.analysisId,
            },
            '[DashboardMetrics] No phase metrics found for analysis',
          );
          return null;
        }

        const phaseMap = new Map<VendorDeepResearchPhaseCategory, typeof subPhaseMetrics>();

        subPhaseMetrics.forEach((entry) => {
          const phaseKey = vendorDeepResearchPhaseCatalog[entry.subPhase].phase;
          if (!phaseMap.has(phaseKey)) {
            phaseMap.set(phaseKey, []);
          }
          phaseMap.get(phaseKey)!.push(entry);
        });

        const phases = vendorDeepResearchPhaseOrder
          .map((phaseKey) => {
            const entries = phaseMap.get(phaseKey) ?? [];
            if (!entries.length) {
              return null;
            }
            const subPhases = vendorDeepResearchSubPhaseOrder
              .filter((subPhaseId) => vendorDeepResearchPhaseCatalog[subPhaseId].phase === phaseKey)
              .map((subPhaseId) => {
                const match = entries.find((entry) => entry.subPhase === subPhaseId);
                if (!match) {
                  return null;
                }
                return {
                  subPhase: subPhaseId,
                  subPhaseLabel: vendorDeepResearchPhaseCatalog[subPhaseId].subPhaseLabel,
                  durationMs: match.durationMs,
                };
              })
              .filter(
                (subPhase): subPhase is { subPhase: VendorDeepResearchSubPhaseId; subPhaseLabel: string; durationMs: number | null } =>
                  Boolean(subPhase),
              );

            if (!subPhases.length) {
              return null;
            }

            return {
              phase: phaseKey,
              phaseLabel: vendorDeepResearchPhaseLabels[phaseKey],
              subPhases,
            };
          })
          .filter(
            (phase): phase is {
              phase: VendorDeepResearchPhaseCategory;
              phaseLabel: string;
              subPhases: Array<{
                subPhase: VendorDeepResearchSubPhaseId;
                subPhaseLabel: string;
                durationMs: number | null;
              }>;
            } => Boolean(phase),
          );

        if (!phases.length) {
          return null;
        }

        return {
          analysisId: run.analysisId,
          vendorId: run.vendorId,
          vendorName: run.vendorName,
          llmModelUsed: run.llmModelUsed,
          status: run.status,
          completedAt: run.completedAt,
          phases,
        };
      })
      .filter(
        (run): run is {
          analysisId: string;
          vendorId: string;
          vendorName: string;
          llmModelUsed: string | null;
          status: VendorDeepResearchStatus;
          completedAt: string | null;
          phases: Array<{
            phase: VendorDeepResearchPhaseCategory;
            phaseLabel: string;
            subPhases: Array<{
              subPhase: VendorDeepResearchSubPhaseId;
              subPhaseLabel: string;
              durationMs: number | null;
            }>;
          }>;
        } => Boolean(run),
      );

    logger.info(
      {
        recentPhaseRunsCount: vendorRecentPhaseRuns.length,
        sample: vendorRecentPhaseRuns[0]
          ? {
              analysisId: vendorRecentPhaseRuns[0].analysisId,
              phases: vendorRecentPhaseRuns[0].phases.length,
            }
          : null,
      },
      '[DashboardMetrics] Vendor recent phase runs built',
    );

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
      vendorDeepResearch: {
        summary: {
          totalAnalyses: totalVendorAnalyses,
          completed: completedVendorAnalyses,
          failed: failedVendorAnalyses,
          avgDurationMs:
            vendorDurationCount > 0 ? vendorDurationSum / vendorDurationCount : null,
        },
        models: vendorModels.sort((a, b) => b.totalAnalyses - a.totalAnalyses),
        recent: vendorRecent,
        timings: {
          phases: vendorTimingPhases,
        },
        recentPhaseRuns: vendorRecentPhaseRuns,
      },
    };
  }
}


