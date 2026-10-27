// Job Card constants and helpers shared by client and server.

/** First job number when there are no jobs yet (owner decision). */
export const FIRST_JOB_NO = 5000;

export function nextJobNo(maxJobNo: number | null | undefined) {
  return Math.max(FIRST_JOB_NO, (maxJobNo ?? 0) + 1);
}

export const SECTIONS = ["A", "B", "C", "D"] as const;
export type SectionKey = (typeof SECTIONS)[number];

/** Section titles and sub-labels exactly as printed on the paper card. */
export const SECTION_INFO: Record<
  SectionKey,
  { title: string; formatLabel: string; foldings: readonly number[]; tallyLabel: string }
> = {
  A: { title: "A. Cover Paper", formatLabel: "Cover Format", foldings: [1, 2, 4, 8, 16], tallyLabel: "A. Cover Sheet" },
  B: { title: "B. Inside Color Paper", formatLabel: "Inside Format", foldings: [1, 2, 4, 8, 16, 32], tallyLabel: "B. Inside Color Sheets" },
  C: { title: "C. Inside Paper", formatLabel: "Inside Format", foldings: [1, 2, 4, 8, 16, 32], tallyLabel: "C. Inside Color/BW Sheets" },
  D: { title: "D. Inside Paper", formatLabel: "Inside Format", foldings: [1, 2, 4, 8, 16, 32], tallyLabel: "D. Inside Color/BW Sheets" },
};

/** Category boxes on the card. Anything else goes in the blank "other" box. */
export const CATEGORY_BOXES = ["A/B", "A/P", "W/F", "DUP"] as const;

export const PRINT_STYLES = [
  { value: "OS", label: "O/S" },
  { value: "FB", label: "F/B" },
  { value: "WT", label: "W/T" },
  { value: "WTUMBLE", label: "W/Tumble" },
] as const;
export type PrintStyle = (typeof PRINT_STYLES)[number]["value"];

export const LAMINATIONS = [
  { value: "GLOSS", label: "Gloss" },
  { value: "MATT", label: "Matt" },
] as const;
export type Lamination = (typeof LAMINATIONS)[number]["value"];

export const BINDINGS = [
  { value: "CS", label: "CS" },
  { value: "PB", label: "PB" },
  { value: "SS", label: "SS" },
  { value: "JUJU", label: "JuJu" },
] as const;
/** OTHER means the free-text box after the binding boxes. */
export type Binding = (typeof BINDINGS)[number]["value"] | "OTHER";

/** Each tally row has 7 boxes, each split into a top and a bottom cell (U9). */
export const TALLY_CELLS = 14;

// ---- Form values (all strings, as typed) ----

export type SectionValues = {
  paperTypeId: string;
  category: string;
  gsm: string;
  size: string;
  format: string;
  folding: string;
  printStyle: PrintStyle | "";
  frontColor: string;
  backColor: string;
  /** Job sheets: information only. */
  sheets: string;
  /** Stock Paper: the paper taken from stock, matched to a paper type and deducted. */
  stockSize: string;
  stockSheets: string;
  tally: string[];
};

export type JobCardValues = {
  jobNo: string;
  date: string;
  client: string;
  jobName: string;
  qty: string;
  paperStock: "PRESS" | "CLIENT";
  colorPlates: string;
  bwPlates: string;
  coverPlates: string;
  spotPlates: string;
  totalPlates: string;
  lamination: Lamination | "";
  /** B-Side is ticked on its own, with or without Gloss / Matt. */
  laminationBSide: boolean;
  laminationNote: string;
  binding: Binding | "";
  bindingOther: string;
  other: string;
  repeatJob: boolean;
  repeatOfJobNo: string;
  sections: Record<SectionKey, SectionValues>;
  providedBy: string;
  receivedBy: string;
  checkedBy: string;
  takenTime: string;
  completedBy: string;
  finalCheckedBy: string;
  handoverTo: string;
  note: string;
};

export function emptySection(): SectionValues {
  return {
    paperTypeId: "",
    category: "",
    gsm: "",
    size: "",
    format: "",
    folding: "",
    printStyle: "",
    frontColor: "",
    backColor: "",
    sheets: "",
    stockSize: "",
    stockSheets: "",
    tally: Array(TALLY_CELLS).fill(""),
  };
}

export function emptyJobCard(jobNo: number, date: string): JobCardValues {
  return {
    jobNo: String(jobNo),
    date,
    client: "",
    jobName: "",
    qty: "",
    paperStock: "PRESS",
    colorPlates: "",
    bwPlates: "",
    coverPlates: "",
    spotPlates: "",
    totalPlates: "",
    lamination: "",
    laminationBSide: false,
    laminationNote: "",
    binding: "",
    bindingOther: "",
    other: "",
    repeatJob: false,
    repeatOfJobNo: "",
    sections: { A: emptySection(), B: emptySection(), C: emptySection(), D: emptySection() },
    providedBy: "",
    receivedBy: "",
    checkedBy: "",
    takenTime: "",
    completedBy: "",
    finalCheckedBy: "",
    handoverTo: "",
    note: "",
  };
}

/** Color + B/W + Cover + Spot, or "" when none are filled in. */
export function sumPlates(v: Pick<JobCardValues, "colorPlates" | "bwPlates" | "coverPlates" | "spotPlates">) {
  const parts = [v.colorPlates, v.bwPlates, v.coverPlates, v.spotPlates].filter((p) => p.trim() !== "");
  if (parts.length === 0) return "";
  return String(parts.reduce((sum, p) => sum + (Number(p) || 0), 0));
}

/** Stock Paper sheets requested per paper type (a type can be used by several sections). */
export function sheetsByPaperType(
  sections: { paperTypeId?: string | null; stockSheets?: number | string | null }[],
) {
  const totals = new Map<string, number>();
  for (const s of sections) {
    const sheets = Number(s.stockSheets);
    if (!s.paperTypeId || !Number.isFinite(sheets) || sheets <= 0) continue;
    totals.set(s.paperTypeId, (totals.get(s.paperTypeId) ?? 0) + sheets);
  }
  return totals;
}

/**
 * Edit job: the ledger rows that bring a job's net issued sheets per paper type
 * (`netIssued`, positive = taken from stock) to the new sheets per paper type.
 * Each row is `net issued − new sheets`, so more paper used gives a negative row.
 */
export function paperCorrections(netIssued: Map<string, number>, next: Map<string, number>) {
  const ids = new Set([...netIssued.keys(), ...next.keys()]);
  return [...ids]
    .map((paperTypeId) => ({
      paperTypeId,
      sheets: (netIssued.get(paperTypeId) ?? 0) - (next.get(paperTypeId) ?? 0),
    }))
    .filter((c) => c.sheets !== 0);
}

// ---- Job Records ----

export const JOB_STATUSES = [
  { value: "CREATED", label: "Created" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;
export type JobStatusValue = (typeof JOB_STATUSES)[number]["value"];

export function statusLabel(status: JobStatusValue) {
  return JOB_STATUSES.find((s) => s.value === status)!.label;
}

/** Job Records-only text columns, edited with "Edit record", in binder order. */
export const RECORD_FIELDS = [
  { key: "recStitching", label: "Stitching", group: "Binding" },
  { key: "recFolding", label: "Folding", group: "Binding" },
  { key: "recLamQty", label: "Qty", group: "Lamination" },
  { key: "recLamSize", label: "Size", group: "Lamination" },
  { key: "deliveryQty", label: "Delivery", group: null },
  { key: "remarks", label: "Remarks", group: null },
] as const;
export type RecordFieldKey = (typeof RECORD_FIELDS)[number]["key"];
/**
 * What "Edit record" edits: the text columns, the Col. tick, and the lamination
 * ticks (Matt / Gloss / B-Side), which are the same values as on the job card.
 */
export type RecordFields = Record<RecordFieldKey, string | null> & {
  recCol: boolean;
  lamination: string | null;
  laminationBSide: boolean;
};

type StoredSection = {
  section: SectionKey;
  paperTypeId: string | null;
  category: string | null;
  gsm: number | null;
  size: string | null;
  format: number | null;
  folding: number | null;
  printStyle: string | null;
  frontColor: string | null;
  backColor: string | null;
  sheets: number | null;
  stockSize: string | null;
  stockSheets: number | null;
  tally: unknown;
};

/** A saved job (with its date already in BS) → Job Card values, for view, print and edit. */
export function jobToCardValues(job: {
  jobNo: number;
  dateBs: string;
  client: string;
  jobName: string;
  qty: number | null;
  paperStock: "PRESS" | "CLIENT";
  colorPlates: number | null;
  bwPlates: number | null;
  coverPlates: number | null;
  spotPlates: number | null;
  totalPlates: number | null;
  lamination: string | null;
  laminationBSide: boolean;
  laminationNote: string | null;
  binding: string | null;
  bindingOther: string | null;
  other: string | null;
  repeatJob: boolean;
  repeatOfJobNo: number | null;
  providedBy: string | null;
  receivedBy: string | null;
  checkedBy: string | null;
  takenTime: string | null;
  completedBy: string | null;
  finalCheckedBy: string | null;
  handoverTo: string | null;
  note: string | null;
  sections: StoredSection[];
}): JobCardValues {
  const text = (v: string | number | null) => (v === null ? "" : String(v));
  const values = emptyJobCard(job.jobNo, job.dateBs);
  for (const s of job.sections) {
    const tally = Array.isArray(s.tally) ? s.tally.map((c) => (typeof c === "string" ? c : "")) : [];
    values.sections[s.section] = {
      paperTypeId: s.paperTypeId ?? "",
      category: text(s.category),
      gsm: text(s.gsm),
      size: text(s.size),
      format: text(s.format),
      folding: text(s.folding),
      printStyle: (s.printStyle ?? "") as PrintStyle | "",
      frontColor: text(s.frontColor),
      backColor: text(s.backColor),
      sheets: text(s.sheets),
      stockSize: text(s.stockSize),
      stockSheets: text(s.stockSheets),
      tally: Array.from({ length: TALLY_CELLS }, (_, i) => tally[i] ?? ""),
    };
  }
  return {
    ...values,
    client: job.client,
    jobName: job.jobName,
    qty: text(job.qty),
    paperStock: job.paperStock,
    colorPlates: text(job.colorPlates),
    bwPlates: text(job.bwPlates),
    coverPlates: text(job.coverPlates),
    spotPlates: text(job.spotPlates),
    totalPlates: text(job.totalPlates),
    lamination: (job.lamination ?? "") as Lamination | "",
    laminationBSide: job.laminationBSide,
    laminationNote: text(job.laminationNote),
    binding: (job.binding ?? "") as Binding | "",
    bindingOther: text(job.bindingOther),
    other: text(job.other),
    repeatJob: job.repeatJob,
    repeatOfJobNo: text(job.repeatOfJobNo),
    providedBy: text(job.providedBy),
    receivedBy: text(job.receivedBy),
    checkedBy: text(job.checkedBy),
    takenTime: text(job.takenTime),
    completedBy: text(job.completedBy),
    finalCheckedBy: text(job.finalCheckedBy),
    handoverTo: text(job.handoverTo),
    note: text(job.note),
  };
}
