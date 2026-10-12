-- AlterTable
ALTER TABLE "JobPaperSection" ADD COLUMN     "folding" INTEGER;

-- The circled 1/2/4/8/16/32 used to be stored as format; it is folding.
UPDATE "JobPaperSection" SET "folding" = "format", "format" = NULL WHERE "format" IS NOT NULL;
