-- No. of Sheets becomes free text ("500 + 100 wastage", "500 with wastage").
-- Fold any wastage already entered into the text before dropping its columns.
ALTER TABLE "JobPaperSection" ALTER COLUMN "sheets" SET DATA TYPE TEXT USING (
  CASE
    WHEN "withWastage" THEN concat_ws(' ', "sheets"::text, 'with wastage')
    WHEN "wastage" IS NOT NULL THEN concat_ws(' + ', "sheets"::text, "wastage"::text || ' wastage')
    ELSE "sheets"::text
  END
);

-- AlterTable
ALTER TABLE "JobPaperSection" DROP COLUMN "wastage",
DROP COLUMN "withWastage";
