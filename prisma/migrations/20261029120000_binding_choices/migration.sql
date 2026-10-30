-- Binding becomes several choices (issue #11). Free-text binding now goes in
-- "other", so the old other-binding text and the Job Records Stitching text
-- move there. Folding becomes a tick like Col.
ALTER TABLE "Job" ADD COLUMN "bindings" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Job" SET "bindings" = ARRAY["binding"] WHERE "binding" IS NOT NULL AND "binding" <> 'OTHER';
UPDATE "Job" SET "other" = NULLIF(concat_ws(', ', NULLIF("other", ''), NULLIF("bindingOther", ''), NULLIF("recStitching", '')), '')
WHERE COALESCE("bindingOther", '') <> '' OR COALESCE("recStitching", '') <> '';

ALTER TABLE "Job" DROP COLUMN "binding",
DROP COLUMN "bindingOther",
DROP COLUMN "recStitching";

ALTER TABLE "Job" ALTER COLUMN "recFolding" SET DATA TYPE BOOLEAN USING (COALESCE(TRIM("recFolding"), '') <> ''),
ALTER COLUMN "recFolding" SET DEFAULT false,
ALTER COLUMN "recFolding" SET NOT NULL;
