import { z } from "zod";
import { SECTION_INFO, SECTIONS, TALLY_CELLS } from "@/lib/jobs";
import { normalizeCategory, normalizeSize } from "@/lib/paper";
import { blankToNull, bsDate, optionalInt, optionalText } from "@/lib/validators/common";

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToNull, z.enum(values).nullable().default(null));

const sectionSchema = z.object({
  section: z.enum(SECTIONS),
  paperTypeId: z.preprocess(blankToNull, z.string().nullable().default(null)),
  category: optionalText(20).transform((v) => (v === null ? null : normalizeCategory(v))),
  gsm: optionalInt("GSM", 2000),
  size: optionalText(20).transform((v) => (v === null ? null : normalizeSize(v))),
  format: optionalInt("Format", 10_000),
  folding: optionalInt("Pieces", 32),
  printStyle: optionalEnum(["OS", "FB", "WT", "WTUMBLE"]),
  frontColor: optionalText(20),
  backColor: optionalText(20),
  sheets: optionalInt("No. of Sheets"),
  stockSize: optionalText(20).transform((v) => (v === null ? null : normalizeSize(v))),
  stockSheets: optionalInt("Stock Paper sheets"),
  tally: z
    .array(z.string().trim().max(20, "Tally boxes hold up to 20 characters"))
    .max(TALLY_CELLS)
    .default([])
    .transform((cells) => (cells.some((c) => c !== "") ? cells : null)),
});

export type ParsedSection = z.output<typeof sectionSchema>;

/** True when nothing but tally boxes was entered, so the section takes no paper. */
function usesNoPaper(s: ParsedSection) {
  return (
    !s.paperTypeId &&
    !s.category &&
    s.gsm === null &&
    !s.size &&
    s.format === null &&
    s.folding === null &&
    !s.printStyle &&
    !s.frontColor &&
    !s.backColor &&
    s.sheets === null &&
    !s.stockSize &&
    s.stockSheets === null
  );
}

/** True when nothing was entered for the section, so no row is saved. */
export function isEmptySection(s: ParsedSection) {
  return usesNoPaper(s) && s.tally === null;
}

export const jobSchema = z
  .object({
    jobNo: z.coerce
      .number({ error: "Enter the job number" })
      .int("Job No must be a whole number")
      .min(1, "Enter the job number")
      .max(9_999_999, "Job No looks too large"),
    date: bsDate,
    client: z.string().trim().min(1, "Enter the client").max(200),
    jobName: z.string().trim().min(1, "Enter the job").max(200),
    qty: optionalInt("Qty"),
    paperStock: z.enum(["PRESS", "CLIENT"], { error: "Choose Paper Stock: 3P or Clients" }),
    colorPlates: optionalInt("Color Plates", 10_000),
    bwPlates: optionalInt("B/W Plates", 10_000),
    coverPlates: optionalInt("Cover Plates", 10_000),
    spotPlates: optionalInt("Spot Plates", 10_000),
    totalPlates: optionalInt("Total Plates", 10_000),
    lamination: optionalEnum(["GLOSS", "MATT"]),
    laminationBSide: z.boolean().default(false),
    laminationNote: optionalText(100),
    binding: optionalEnum(["CS", "PB", "SS", "JUJU", "OTHER"]),
    bindingOther: optionalText(50),
    other: optionalText(500),
    repeatJob: z.boolean().default(false),
    repeatOfJobNo: optionalInt("Repeat Job No", 9_999_999),
    sections: z.array(sectionSchema).max(4),
    providedBy: optionalText(100),
    receivedBy: optionalText(100),
    checkedBy: optionalText(100),
    takenTime: optionalText(100),
    completedBy: optionalText(100),
    finalCheckedBy: optionalText(100),
    handoverTo: optionalText(100),
    note: optionalText(2000),
  })
  .superRefine((job, ctx) => {
    const seen = new Set<string>();
    job.sections.forEach((s, i) => {
      const info = SECTION_INFO[s.section];
      if (seen.has(s.section)) {
        ctx.addIssue({ code: "custom", path: ["sections", i], message: `${info.title} appears twice` });
      }
      seen.add(s.section);

      if (s.folding !== null && !info.foldings.includes(s.folding)) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "folding"],
          message: `${info.title} Pieces must be ${info.foldings.join("/")}`,
        });
      }
      if (s.sheets === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "sheets"],
          message: `No. of Sheets for ${info.title} must be more than 0`,
        });
      }
      if (usesNoPaper(s)) return;
      // Every section that takes paper says which stock it comes from.
      if (!s.stockSize) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "stockSize"],
          message: `Enter the Stock Paper size for ${info.title}`,
        });
      } else if (!s.paperTypeId) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "paperTypeId"],
          message:
            job.paperStock === "PRESS"
              ? `No 3P paper matches the category, GSM and stock size for ${info.title}`
              : `No paper from ${job.client || "this client"} matches the category, GSM and stock size for ${info.title}`,
        });
      }
      if (!s.stockSheets) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "stockSheets"],
          message: `Enter the Stock Paper sheets for ${info.title}`,
        });
      }
    });
  })
  .transform((job) => ({
    ...job,
    binding: job.binding ?? (job.bindingOther ? ("OTHER" as const) : null),
    bindingOther: job.binding === null || job.binding === "OTHER" ? job.bindingOther : null,
    repeatOfJobNo: job.repeatJob ? job.repeatOfJobNo : null,
    // The server copies category, GSM and stock size from the paper type.
    sections: job.sections.filter((s) => !isEmptySection(s)),
  }));

export type JobInput = z.input<typeof jobSchema>;
export type ParsedJob = z.output<typeof jobSchema>;

export const jobRecordSchema = z.object({
  id: z.string().min(1),
  recCol: z.boolean().default(false),
  recStitching: optionalText(100),
  recFolding: optionalText(100),
  lamination: optionalEnum(["GLOSS", "MATT"]),
  laminationBSide: z.boolean().default(false),
  recLamQty: optionalText(100),
  recLamSize: optionalText(100),
  deliveryQty: optionalText(100),
  remarks: optionalText(500),
});
