-- CreateEnum
CREATE TYPE "VendorDeepResearchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "VendorDeepResearchReport" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "VendorDeepResearchStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "report" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDeepResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorDeepResearchReport_vendorId_key" ON "VendorDeepResearchReport"("vendorId");

-- AddForeignKey
ALTER TABLE "VendorDeepResearchReport" ADD CONSTRAINT "VendorDeepResearchReport_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
