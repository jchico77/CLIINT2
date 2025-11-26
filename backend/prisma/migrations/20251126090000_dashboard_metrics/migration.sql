-- CreateEnum
CREATE TYPE "DashboardRunStatus" AS ENUM ('success', 'error');

-- CreateEnum
CREATE TYPE "DashboardPhaseStatus" AS ENUM ('success', 'error');

-- CreateEnum
CREATE TYPE "DashboardPhaseType" AS ENUM (
    'deepResearch',
    'clientResearch',
    'vendorResearch',
    'fitStrategy',
    'proposalOutline',
    'newsResearch',
    'persistToDb'
);

-- CreateTable
CREATE TABLE "DashboardGenerationRun" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceOfferingId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "llmModelUsed" TEXT,
    "config" JSONB,
    "featureToggles" JSONB,
    "status" "DashboardRunStatus" NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardGenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardPhaseMetric" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phase" "DashboardPhaseType" NOT NULL,
    "model" TEXT,
    "reasoningEffort" TEXT,
    "featureToggles" JSONB,
    "cacheMode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "status" "DashboardPhaseStatus" NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPhaseMetric_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DashboardGenerationRun" ADD CONSTRAINT "DashboardGenerationRun_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardPhaseMetric" ADD CONSTRAINT "DashboardPhaseMetric_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DashboardGenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

