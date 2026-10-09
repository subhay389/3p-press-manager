import { z } from "zod";
import { parseBs } from "@/lib/nepali-date";

// Building blocks shared by the form schemas.

export const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** Optional free text: blank → null. */
export const optionalText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().default(null));

/** Optional whole number typed into a text box: blank → null. */
export const optionalInt = (label: string, max = 10_000_000) =>
  z.preprocess(
    blankToNull,
    z.coerce
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(0, `${label} can't be negative`)
      .max(max, `${label} looks too large`)
      .nullable()
      .default(null),
  );

/** BS "YYYY/MM/DD" → AD Date at UTC midnight. */
export const bsDate = z.string().transform((v, ctx) => {
  const d = parseBs(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Enter a valid BS date as YYYY/MM/DD" });
    return z.NEVER;
  }
  return d;
});
