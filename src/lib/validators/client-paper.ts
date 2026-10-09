import { z } from "zod";
import { normalizeCategory, normalizeSize } from "@/lib/paper";
import { bsDate, optionalInt, optionalText } from "@/lib/validators/common";

/** One row of the Paper – Client binder: what came in, what was cut, what is left. */
export const clientPaperSchema = z.object({
  date: bsDate,
  client: z.string().trim().min(1, "Enter the client").max(200),
  gsm: optionalInt("GSM", 2000),
  category: optionalText(20).transform((v) => (v === null ? null : normalizeCategory(v))),
  size: optionalText(20).transform((v) => (v === null ? null : normalizeSize(v))),
  packets: optionalInt("Pkts"),
  sheets: optionalInt("Sheets"),
  cutJob: optionalText(200),
  cutJobNo: optionalText(50),
  cutPackets: optionalInt("Cutting Pkts"),
  cutSheets: optionalInt("Cutting Sheets"),
  balancePackets: optionalInt("Balance Pkts"),
  remarks: optionalText(500),
});

export const updateClientPaperSchema = clientPaperSchema.extend({ id: z.string().min(1) });

export type ClientPaperInput = z.input<typeof clientPaperSchema>;
