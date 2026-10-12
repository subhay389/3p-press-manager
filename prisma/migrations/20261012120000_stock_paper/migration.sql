-- DropIndex
DROP INDEX "PaperType_category_gsm_size_key";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "paperShortage";

-- AlterTable
ALTER TABLE "JobPaperSection" ADD COLUMN     "stockSheets" INTEGER,
ADD COLUMN     "stockSize" TEXT;

-- AlterTable
ALTER TABLE "PaperType" ADD COLUMN     "client" TEXT,
ADD COLUMN     "clientKey" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "ClientPaperRecord";

-- CreateIndex
CREATE UNIQUE INDEX "PaperType_clientKey_category_gsm_size_key" ON "PaperType"("clientKey", "category", "gsm", "size");


-- 3P sections already deducted their Size / No. of Sheets: carry them over as Stock Paper.
UPDATE "JobPaperSection" SET "stockSize" = "size", "stockSheets" = "sheets" WHERE "paperTypeId" IS NOT NULL;
