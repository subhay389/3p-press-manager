import { describe, expect, it } from "vitest";
import { jobToCardValues, SECTIONS, TALLY_CELLS } from "@/lib/jobs";
import { jobRecordSchema, jobSchema } from "@/lib/validators/jobs";

const stored = {
  jobNo: 5002,
  dateBs: "2083/06/24",
  client: "Shankar Paper Works",
  jobName: "Malai Kulfi Pack",
  qty: 5200,
  paperStock: "PRESS" as const,
  colorPlates: 4,
  bwPlates: null,
  spotPlates: null,
  totalPlates: 4,
  lamination: "GLOSS",
  laminationBSide: true,
  laminationNote: null,
  binding: "OTHER",
  bindingOther: "Spiral",
  other: null,
  repeatJob: true,
  repeatOfJobNo: 4870,
  providedBy: null,
  receivedBy: "Ram",
  checkedBy: null,
  takenTime: null,
  completedBy: null,
  finalCheckedBy: null,
  handoverTo: null,
  note: "Ink coverage",
  sections: [
    {
      section: "A" as const,
      paperTypeId: "pt1",
      category: "A/B",
      gsm: 250,
      size: "24x36",
      format: 12,
      folding: 1,
      printStyle: "OS",
      frontColor: "4",
      backColor: null,
      sheets: 2000,
      stockSize: "24x36",
      stockSheets: 1000,
      tally: ["1000", ""],
    },
  ],
};

describe("jobToCardValues", () => {
  it("turns a saved job into Job Card form values", () => {
    const v = jobToCardValues(stored);
    expect(v).toMatchObject({
      jobNo: "5002",
      date: "2083/06/24",
      qty: "5200",
      bwPlates: "",
      lamination: "GLOSS",
      laminationBSide: true,
      binding: "OTHER",
      bindingOther: "Spiral",
      repeatJob: true,
      repeatOfJobNo: "4870",
      note: "Ink coverage",
    });
    expect(v.sections.A).toMatchObject({ paperTypeId: "pt1", gsm: "250", format: "12", folding: "1", sheets: "2000", stockSize: "24x36", stockSheets: "1000", backColor: "" });
    expect(v.sections.A.tally).toHaveLength(TALLY_CELLS);
    expect(v.sections.A.tally[0]).toBe("1000");
    expect(v.sections.B.paperTypeId).toBe("");
  });

  it("round-trips through the job schema unchanged", () => {
    const v = jobToCardValues(stored);
    const parsed = jobSchema.parse({ ...v, sections: SECTIONS.map((section) => ({ section, ...v.sections[section] })) });
    expect(parsed).toMatchObject({ jobNo: 5002, qty: 5200, lamination: "GLOSS", laminationBSide: true, binding: "OTHER", bindingOther: "Spiral", repeatJob: true, repeatOfJobNo: 4870 });
    // The number is dropped when the job is not marked as a repeat.
    expect(jobSchema.parse({ ...v, repeatJob: false, sections: [] }).repeatOfJobNo).toBeNull();
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0]).toMatchObject({ section: "A", paperTypeId: "pt1", sheets: 2000, stockSize: "24x36", stockSheets: 1000, format: 12, folding: 1 });
  });
});

describe("jobRecordSchema", () => {
  it("keeps binder marks as text and blanks as null", () => {
    const r = jobRecordSchema.parse({ id: "j1", recCol: true, recStitching: " C.S. ", deliveryQty: "5080", remarks: "" });
    expect(r).toMatchObject({ recCol: true, recStitching: "C.S.", recFolding: null, deliveryQty: "5080", remarks: null });
  });

  it("saves the lamination ticks: Matt or Gloss, and B-Side on its own", () => {
    expect(jobRecordSchema.parse({ id: "j1", lamination: "", laminationBSide: true })).toMatchObject({
      recCol: false,
      lamination: null,
      laminationBSide: true,
    });
    expect(jobRecordSchema.parse({ id: "j1", lamination: "MATT" }).lamination).toBe("MATT");
    expect(jobRecordSchema.safeParse({ id: "j1", lamination: "GLOSSY" }).success).toBe(false);
  });
});
