-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "PaperStock" AS ENUM ('PRESS', 'CLIENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('CREATED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobSection" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIPT', 'JOB_ISSUE', 'JOB_CORRECTION', 'JOB_CANCEL', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "AllowedUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperType" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "gsm" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "paperTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "MovementType" NOT NULL,
    "sheets" INTEGER NOT NULL,
    "packets" INTEGER,
    "particulars" TEXT,
    "remarks" TEXT,
    "jobId" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "jobNo" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "client" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "qty" INTEGER,
    "paperStock" "PaperStock" NOT NULL,
    "colorPlates" INTEGER,
    "bwPlates" INTEGER,
    "spotPlates" INTEGER,
    "totalPlates" INTEGER,
    "lamination" TEXT,
    "laminationNote" TEXT,
    "binding" TEXT,
    "bindingOther" TEXT,
    "other" TEXT,
    "providedBy" TEXT,
    "receivedBy" TEXT,
    "checkedBy" TEXT,
    "takenTime" TEXT,
    "completedBy" TEXT,
    "finalCheckedBy" TEXT,
    "handoverTo" TEXT,
    "note" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'CREATED',
    "paperShortage" BOOLEAN NOT NULL DEFAULT false,
    "recCol" TEXT,
    "recStitching" TEXT,
    "recFolding" TEXT,
    "recLamMatt" TEXT,
    "recLamGlossy" TEXT,
    "recLamQty" TEXT,
    "recLamSize" TEXT,
    "deliveryQty" TEXT,
    "remarks" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPaperSection" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "section" "JobSection" NOT NULL,
    "paperTypeId" TEXT,
    "category" TEXT,
    "gsm" INTEGER,
    "size" TEXT,
    "format" INTEGER,
    "printStyle" TEXT,
    "frontColor" TEXT,
    "backColor" TEXT,
    "sheets" INTEGER,
    "tally" JSONB,

    CONSTRAINT "JobPaperSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPaperRecord" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "client" TEXT NOT NULL,
    "gsm" INTEGER,
    "category" TEXT,
    "size" TEXT,
    "packets" INTEGER,
    "sheets" INTEGER,
    "cutJob" TEXT,
    "cutJobNo" TEXT,
    "cutPackets" INTEGER,
    "cutSheets" INTEGER,
    "balancePackets" INTEGER,
    "remarks" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPaperRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedUser_email_key" ON "AllowedUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PaperType_category_gsm_size_key" ON "PaperType"("category", "gsm", "size");

-- CreateIndex
CREATE INDEX "StockMovement_paperTypeId_date_idx" ON "StockMovement"("paperTypeId", "date");

-- CreateIndex
CREATE INDEX "StockMovement_jobId_idx" ON "StockMovement"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobNo_key" ON "Job"("jobNo");

-- CreateIndex
CREATE INDEX "Job_date_idx" ON "Job"("date");

-- CreateIndex
CREATE UNIQUE INDEX "JobPaperSection_jobId_section_key" ON "JobPaperSection"("jobId", "section");

-- CreateIndex
CREATE INDEX "ClientPaperRecord_date_idx" ON "ClientPaperRecord"("date");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_paperTypeId_fkey" FOREIGN KEY ("paperTypeId") REFERENCES "PaperType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPaperSection" ADD CONSTRAINT "JobPaperSection_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPaperSection" ADD CONSTRAINT "JobPaperSection_paperTypeId_fkey" FOREIGN KEY ("paperTypeId") REFERENCES "PaperType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
