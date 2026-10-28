-- AlterTable
ALTER TABLE "JobPaperSection" ADD COLUMN     "wastage" INTEGER,
ADD COLUMN     "withWastage" BOOLEAN NOT NULL DEFAULT false;
