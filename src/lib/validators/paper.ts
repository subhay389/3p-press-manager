import { z } from "zod";
import { parseBs } from "@/lib/nepali-date";
import { normalizeCategory, normalizeSize } from "@/lib/paper";

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const optionalText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().default(null));

const bsDate = z
  .string()
  .transform((v, ctx) => {
    const d = parseBs(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid BS date as YYYY/MM/DD" });
      return z.NEVER;
    }
    return d;
  });

export const paperTypeSchema = z.object({
  category: z
    .string()
    .transform(normalizeCategory)
    .pipe(z.string().min(1, "Enter a category").max(20, "Category is too long")),
  gsm: z.coerce
    .number({ error: "Enter GSM as a number" })
    .int("GSM must be a whole number")
    .min(1, "Enter GSM")
    .max(2000, "GSM looks too large"),
  size: z
    .string()
    .transform(normalizeSize)
    .pipe(z.string().min(1, "Enter a size").max(20, "Size is too long")),
});

export const addPaperSchema = paperTypeSchema.extend({
  date: bsDate,
  particulars: optionalText(200),
  packets: z.preprocess(
    blankToNull,
    z.coerce.number().int("Pkts must be a whole number").min(0).nullable().default(null),
  ),
  sheets: z.coerce
    .number({ error: "Enter the number of sheets" })
    .int("Sheets must be a whole number")
    .min(1, "Sheets must be at least 1"),
  remarks: optionalText(200),
});

export const adjustStockSchema = z.object({
  paperTypeId: z.string().min(1),
  date: bsDate,
  newBalance: z.coerce
    .number({ error: "Enter the counted balance" })
    .int("Balance must be a whole number")
    .min(0, "Balance can't be negative"),
  reason: z.string().trim().min(1, "Enter a reason").max(200),
});

export const updatePaperTypeSchema = paperTypeSchema.extend({ id: z.string().min(1) });

export type AddPaperInput = z.input<typeof addPaperSchema>;
