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
  { title: string; formatLabel: string; formats: readonly number[]; tallyLabel: string }
> = {
  A: { title: "A. Cover Paper", formatLabel: "Cover Format", formats: [1, 2, 4, 8, 16], tallyLabel: "A. Cover Sheet" },
  B: { title: "B. Inside Color Paper", formatLabel: "Inside Format", formats: [1, 2, 4, 8, 16, 32], tallyLabel: "B. Inside Color Sheets" },
  C: { title: "C. Inside Paper", formatLabel: "Inside Format", formats: [1, 2, 4, 8, 16, 32], tallyLabel: "C. Inside Color/BW Sheets" },
  D: { title: "D. Inside Paper", formatLabel: "Inside Format", formats: [1, 2, 4, 8, 16, 32], tallyLabel: "D. Inside Color/BW Sheets" },
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
  printStyle: PrintStyle | "";
  frontColor: string;
  backColor: string;
  sheets: string;
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
  spotPlates: string;
  totalPlates: string;
  lamination: Lamination | "";
  laminationNote: string;
  binding: Binding | "";
  bindingOther: string;
  other: string;
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
    printStyle: "",
    frontColor: "",
    backColor: "",
    sheets: "",
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
    spotPlates: "",
    totalPlates: "",
    lamination: "",
    laminationNote: "",
    binding: "",
    bindingOther: "",
    other: "",
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

/** Color + B/W + Spot, or "" when none are filled in. */
export function sumPlates(v: Pick<JobCardValues, "colorPlates" | "bwPlates" | "spotPlates">) {
  const parts = [v.colorPlates, v.bwPlates, v.spotPlates].filter((p) => p.trim() !== "");
  if (parts.length === 0) return "";
  return String(parts.reduce((sum, p) => sum + (Number(p) || 0), 0));
}

/** Total sheets requested per paper type (a type can be used by several sections). */
export function sheetsByPaperType(
  sections: { paperTypeId?: string | null; sheets?: number | string | null }[],
) {
  const totals = new Map<string, number>();
  for (const s of sections) {
    const sheets = Number(s.sheets);
    if (!s.paperTypeId || !Number.isFinite(sheets) || sheets <= 0) continue;
    totals.set(s.paperTypeId, (totals.get(s.paperTypeId) ?? 0) + sheets);
  }
  return totals;
}
