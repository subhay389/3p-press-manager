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
  format: optionalInt("Format", 32),
  printStyle: optionalEnum(["OS", "FB", "WT", "WTUMBLE"]),
  frontColor: optionalText(20),
  backColor: optionalText(20),
  sheets: optionalInt("No. of Sheets"),
  tally: z
    .array(z.string().trim().max(20, "Tally boxes hold up to 20 characters"))
    .max(TALLY_CELLS)
    .default([])
    .transform((cells) => (cells.some((c) => c !== "") ? cells : null)),
});

export type ParsedSection = z.output<typeof sectionSchema>;

/** True when nothing was entered for the section, so no row is saved. */
export function isEmptySection(s: ParsedSection) {
  return (
    !s.paperTypeId &&
    !s.category &&
    s.gsm === null &&
    !s.size &&
    s.format === null &&
    !s.printStyle &&
    !s.frontColor &&
    !s.backColor &&
    s.sheets === null &&
    s.tally === null
  );
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
    spotPlates: optionalInt("Spot Plates", 10_000),
    totalPlates: optionalInt("Total Plates", 10_000),
    lamination: optionalEnum(["GLOSS", "MATT"]),
    laminationNote: optionalText(100),
    binding: optionalEnum(["CS", "PB", "SS", "JUJU", "OTHER"]),
    bindingOther: optionalText(50),
    other: optionalText(500),
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

      if (s.format !== null && !info.formats.includes(s.format)) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "format"],
          message: `${info.formatLabel} must be ${info.formats.join("/")}`,
        });
      }
      if (s.sheets === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "sheets"],
          message: `No. of Sheets for ${info.title} must be more than 0`,
        });
      }
      if (job.paperStock === "PRESS") {
        if (s.sheets !== null && !s.paperTypeId) {
          ctx.addIssue({
            code: "custom",
            path: ["sections", i, "paperTypeId"],
            message: `No 3P paper matches the category, GSM and size for ${info.title}`,
          });
        }
        if (s.paperTypeId && s.sheets === null) {
          ctx.addIssue({
            code: "custom",
            path: ["sections", i, "sheets"],
            message: `Enter No. of Sheets for ${info.title}`,
          });
        }
      }
    });
  })
  .transform((job) => ({
    ...job,
    binding: job.binding ?? (job.bindingOther ? ("OTHER" as const) : null),
    bindingOther: job.binding === null || job.binding === "OTHER" ? job.bindingOther : null,
    sections: job.sections
      .map((s) =>
        job.paperStock === "CLIENT"
          ? // Client paper is never linked to 3P stock (U2).
            { ...s, paperTypeId: null }
          : // 3P paper is described by its paper type; the server copies its
            // category, GSM and size, so typed text is dropped.
            { ...s, category: null, gsm: null, size: null },
      )
      .filter((s) => !isEmptySection(s)),
  }));

export type JobInput = z.input<typeof jobSchema>;
export type ParsedJob = z.output<typeof jobSchema>;

export const jobRecordSchema = z.object({
  id: z.string().min(1),
  recCol: optionalText(100),
  recStitching: optionalText(100),
  recFolding: optionalText(100),
  recLamMatt: optionalText(100),
  recLamGlossy: optionalText(100),
  recLamQty: optionalText(100),
  recLamSize: optionalText(100),
  deliveryQty: optionalText(100),
  remarks: optionalText(500),
});
