import { z } from "zod";
import { normalizeCategory, normalizeSize } from "@/lib/paper";
import { blankToNull, bsDate, optionalText } from "@/lib/validators/common";

export const paperTypeSchema = z.object({
  /** Blank for 3P stock; the client's name for client paper. */
  client: optionalText(200),
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
}).refine((v) => v.client !== null || v.particulars !== null, {
  // 3P receipts need Particulars (supplier, bill no. or "Opening stock").
  path: ["particulars"],
  message: "Enter the particulars",
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
