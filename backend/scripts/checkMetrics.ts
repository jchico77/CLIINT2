import { DashboardPhaseStatus, DashboardPhaseType, DashboardRunStatus } from '@prisma/client';
import { DashboardMetricsService } from '../src/domain/services/dashboardMetricsService';
import { prisma } from '../src/lib/prisma';

async function main() {
  const run = await DashboardMetricsService.startRun({
    vendorId: 'metrics-check-vendor',
    clientId: 'metrics-check-client',
    serviceOfferingId: 'metrics-check-service',
    llmModelUsed: 'metrics-checker',
    featureToggles: { metricsSmokeTest: true },
  });

  const phase = await DashboardMetricsService.startPhase({
    runId: run.id,
    phase: DashboardPhaseType.deepResearch,
    model: 'metrics-checker',
  });

  await DashboardMetricsService.finishPhase(phase, { status: DashboardPhaseStatus.success });
  await DashboardMetricsService.finishRun(run, { status: DashboardRunStatus.success });

  // Clean up so the table stays lean
  await prisma.dashboardGenerationRun.delete({ where: { id: run.id } });

  console.log('Metrics tables operational (run + phase persisted correctamente).');
}

main()
  .catch((error) => {
    console.error('Metrics check failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


