-- CreateTable
CREATE TABLE "VendorDeepResearchPhaseMetric" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "subPhase" TEXT NOT NULL,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "analysisStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorDeepResearchPhaseMetric_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VendorDeepResearchPhaseMetric" ADD CONSTRAINT "VendorDeepResearchPhaseMetric_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "VendorDeepResearchPhaseMetric_vendorId_analysisStartedAt_idx" ON "VendorDeepResearchPhaseMetric"("vendorId", "analysisStartedAt");

-- CreateIndex
CREATE INDEX "VendorDeepResearchPhaseMetric_analysisId_idx" ON "VendorDeepResearchPhaseMetric"("analysisId");

-- CreateIndex
CREATE INDEX "VendorDeepResearchPhaseMetric_phase_idx" ON "VendorDeepResearchPhaseMetric"("phase");

-- CreateIndex
CREATE INDEX "VendorDeepResearchPhaseMetric_subPhase_idx" ON "VendorDeepResearchPhaseMetric"("subPhase");

