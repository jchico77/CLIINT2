/// <reference types="node" />
/* eslint-disable no-console */
import { prisma } from '../src/lib/prisma';

async function main() {
  const reports = await prisma.vendorDeepResearchReport.findMany({
    orderBy: { completedAt: 'desc' },
    take: 5,
    include: { vendor: true },
  });

  const analysesWithIds = reports
    .filter((report) => report.analysisId)
    .map((report) => report.analysisId as string);

  console.log('Recent reports (analysisId, vendor, completedAt):');
  reports.forEach((report) => {
    console.log({
      vendor: report.vendor?.name ?? report.vendorId,
      analysisId: report.analysisId,
      completedAt: report.completedAt?.toISOString() ?? null,
    });
  });

  if (!analysesWithIds.length) {
    console.log('No recent reports with analysisId.');
    return;
  }

  const metrics = await prisma.vendorDeepResearchPhaseMetric.findMany({
    where: { analysisId: { in: analysesWithIds } },
    orderBy: { analysisId: 'desc' },
  });

  console.log(`Fetched ${metrics.length} phase metrics for last analyses.`);
  metrics.forEach((metric) => {
    console.log({
      analysisId: metric.analysisId,
      phase: metric.phase,
      subPhase: metric.subPhase,
      durationMs: metric.durationMs,
    });
  });
}

main()
  .catch((error) => {
    console.error('Debug recent phase runs failed:', error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


