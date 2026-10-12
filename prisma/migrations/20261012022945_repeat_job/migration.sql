-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "repeatJob" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repeatOfJobNo" INTEGER;
