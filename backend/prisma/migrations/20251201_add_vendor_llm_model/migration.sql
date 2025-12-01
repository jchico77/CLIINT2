-- Add llmModelUsed column to vendor deep research reports
ALTER TABLE "VendorDeepResearchReport"
ADD COLUMN "llmModelUsed" TEXT;

