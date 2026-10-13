-- Ink Coverage: one photo or PDF per job, stored in Vercel Blob.
ALTER TABLE "Job" ADD COLUMN     "inkCoverageAt" TIMESTAMP(3),
ADD COLUMN     "inkCoverageByEmail" TEXT,
ADD COLUMN     "inkCoverageKind" TEXT,
ADD COLUMN     "inkCoverageThumbUrl" TEXT,
ADD COLUMN     "inkCoverageUrl" TEXT;
