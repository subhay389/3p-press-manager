-- Lamination B-Side is a tick on the job card, beside Gloss / Matt.
ALTER TABLE "Job" ADD COLUMN "laminationBSide" BOOLEAN NOT NULL DEFAULT false;

-- Job Records Matt / Gloss now show the job card's lamination. Keep what was
-- written in the old free-text columns when the card had none.
UPDATE "Job" SET "lamination" = 'MATT'
WHERE "lamination" IS NULL AND COALESCE(TRIM("recLamMatt"), '') <> '';
UPDATE "Job" SET "lamination" = 'GLOSS'
WHERE "lamination" IS NULL AND COALESCE(TRIM("recLamGlossy"), '') <> '';

-- "B-side" used to be typed in the lamination note.
UPDATE "Job" SET "laminationBSide" = true WHERE "laminationNote" ~* 'b[ -]?side';
UPDATE "Job" SET "laminationNote" = NULL WHERE "laminationNote" ~* '^\s*b[ -]?side\s*$';

ALTER TABLE "Job" DROP COLUMN "recLamMatt",
DROP COLUMN "recLamGlossy";

-- Col. is a tick: anything written there counts as ticked.
ALTER TABLE "Job" ALTER COLUMN "recCol" TYPE BOOLEAN USING (COALESCE(TRIM("recCol"), '') <> ''),
ALTER COLUMN "recCol" SET DEFAULT false,
ALTER COLUMN "recCol" SET NOT NULL;
