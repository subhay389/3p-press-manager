import { describe, expect, it } from "vitest";
import {
  emptyJobCard,
  nextJobNo,
  paperCorrections,
  SECTIONS,
  sheetsByPaperType,
  sumPlates,
} from "@/lib/jobs";
import { jobSchema } from "@/lib/validators/jobs";

/** A Stock Paper linked to a paper type, so a section can be saved. */
const stock = { paperTypeId: "pt1", stockSize: "24x36", stockSheets: "50" };

function formInput(patch: (v: ReturnType<typeof emptyJobCard>) => void = () => {}) {
  const v = emptyJobCard(5000, "2083/06/23");
  v.client = " Shankar Paper Works ";
  v.jobName = "Malai Kulfi Pack";
  patch(v);
  return { ...v, sections: SECTIONS.map((section) => ({ section, ...v.sections[section] })) };
}

describe("job number", () => {
  it("starts at 5000 and follows the highest job", () => {
    expect(nextJobNo(null)).toBe(5000);
    expect(nextJobNo(1943)).toBe(5000);
    expect(nextJobNo(5012)).toBe(5013);
  });
});

describe("helpers", () => {
  it("sums plates only when some are entered", () => {
    expect(sumPlates({ colorPlates: "", bwPlates: "", coverPlates: "", spotPlates: "" })).toBe("");
    expect(sumPlates({ colorPlates: "4", bwPlates: "", coverPlates: "", spotPlates: "1" })).toBe("5");
    expect(sumPlates({ colorPlates: "4", bwPlates: "2", coverPlates: "3", spotPlates: "" })).toBe("9");
  });

  it("adds sheets for a paper type used in several sections", () => {
    const totals = sheetsByPaperType([
      { paperTypeId: "a", stockSheets: "100" },
      { paperTypeId: "a", stockSheets: 50 },
      { paperTypeId: "b", stockSheets: "" },
      { paperTypeId: "", stockSheets: "10" },
    ]);
    expect([...totals]).toEqual([["a", 150]]);
  });
});

describe("jobSchema", () => {
  it("parses an empty card into a job with no sections", () => {
    const r = jobSchema.parse(formInput());
    expect(r).toMatchObject({
      jobNo: 5000,
      client: "Shankar Paper Works",
      paperStock: "PRESS",
      qty: null,
      lamination: null,
      binding: null,
      sections: [],
    });
    expect(r.date.toISOString().slice(0, 10)).toBe("2026-10-09");
  });

  it("keeps the job size and sheets as information beside the Stock Paper", () => {
    const r = jobSchema.parse(
      formInput((v) => {
        v.sections.A = {
          ...v.sections.A,
          paperTypeId: "pt1",
          category: "a/b",
          gsm: "250",
          size: "18 X 24",
          sheets: "100",
          stockSize: "24 x 36",
          stockSheets: "50",
          format: "12",
          folding: "4",
          printStyle: "OS",
        };
      }),
    );
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0]).toMatchObject({
      section: "A",
      paperTypeId: "pt1",
      category: "A/B",
      gsm: 250,
      size: "18x24",
      sheets: 100,
      stockSize: "24x36",
      stockSheets: 50,
      format: 12,
      folding: 4,
      printStyle: "OS",
      tally: null,
    });
  });

  it("records wastage as extra sheets or as already included, not both", () => {
    const section = (patch: Partial<ReturnType<typeof emptyJobCard>["sections"]["A"]>) =>
      jobSchema.parse(
        formInput((v) => {
          v.sections.A = { ...v.sections.A, ...stock, category: "a/b", gsm: "250", sheets: "500", ...patch };
        }),
      ).sections[0];
    expect(section({ wastage: "100" })).toMatchObject({ sheets: 500, wastage: 100, withWastage: false, stockSheets: 50 });
    expect(section({ withWastage: true })).toMatchObject({ sheets: 500, wastage: null, withWastage: true });
    expect(section({ wastage: "100", withWastage: true })).toMatchObject({ wastage: null, withWastage: true });
    expect(jobSchema.safeParse(formInput((v) => Object.assign(v.sections.A, stock, { wastage: "0" }))).error?.issues[0]?.message).toBe(
      "Wastage for A. Cover Paper must be more than 0",
    );
  });

  it("links client jobs to the client's paper too", () => {
    const r = jobSchema.parse(
      formInput((v) => {
        v.paperStock = "CLIENT";
        v.sections.A = { ...v.sections.A, ...stock, category: "a/b", gsm: "230", size: "525 X 740" };
      }),
    );
    expect(r.sections[0]).toMatchObject({ paperTypeId: "pt1", category: "A/B", gsm: 230, size: "525x740", stockSheets: 50 });
  });

  it("requires Stock Paper in every section that takes paper", () => {
    const issue = (patch: (v: ReturnType<typeof emptyJobCard>) => void) =>
      jobSchema.safeParse(formInput(patch)).error?.issues[0]?.message;
    expect(issue((v) => (v.sections.B.sheets = "100"))).toBe("Enter the Stock Paper size for B. Inside Color Paper");
    expect(issue((v) => Object.assign(v.sections.B, { stockSize: "24x36", stockSheets: "50" }))).toBe(
      "No 3P paper matches the category, GSM and stock size for B. Inside Color Paper",
    );
    expect(
      issue((v) => {
        v.paperStock = "CLIENT";
        Object.assign(v.sections.B, { stockSize: "24x36", stockSheets: "50" });
      }),
    ).toBe("No paper from Shankar Paper Works matches the category, GSM and stock size for B. Inside Color Paper");
    expect(issue((v) => Object.assign(v.sections.C, { paperTypeId: "pt1", stockSize: "24x36" }))).toBe(
      "Enter the Stock Paper sheets for C. Inside Paper",
    );
  });

  it("only allows folding 32 for inside sections", () => {
    const fold = (key: "A" | "B", folding: string) =>
      jobSchema.safeParse(formInput((v) => Object.assign(v.sections[key], stock, { folding }))).success;
    expect(fold("A", "32")).toBe(false);
    expect(fold("B", "32")).toBe(true);
    expect(fold("B", "3")).toBe(false);
    // Format is any whole number.
    expect(jobSchema.safeParse(formInput((v) => Object.assign(v.sections.A, stock, { format: "3" }))).success).toBe(true);
  });

  it("stores the other-binding text as binding OTHER", () => {
    const r = jobSchema.parse(formInput((v) => (v.bindingOther = "Spiral")));
    expect(r).toMatchObject({ binding: "OTHER", bindingOther: "Spiral" });
  });

  it("keeps tally cells only when something is written", () => {
    const r = jobSchema.parse(formInput((v) => (v.sections.D.tally[3] = "500")));
    expect(r.sections[0]?.section).toBe("D");
    expect(r.sections[0]?.tally?.[3]).toBe("500");
  });

  it("rejects a missing client or job", () => {
    expect(jobSchema.safeParse(formInput((v) => (v.client = " "))).error?.issues[0]?.message).toBe("Enter the client");
  });
});

describe("paperCorrections (Edit job)", () => {
  const m = (...e: [string, number][]) => new Map(e);

  it("writes nothing when the sheets are unchanged", () => {
    expect(paperCorrections(m(["a", 100]), m(["a", 100]))).toEqual([]);
  });

  it("returns paper when fewer sheets are used, takes more when more are used", () => {
    expect(paperCorrections(m(["a", 100]), m(["a", 80]))).toEqual([{ paperTypeId: "a", sheets: 20 }]);
    expect(paperCorrections(m(["a", 100]), m(["a", 130]))).toEqual([{ paperTypeId: "a", sheets: -30 }]);
  });

  it("covers a changed paper type", () => {
    expect(paperCorrections(m(["a", 100]), m(["b", 100]))).toEqual([
      { paperTypeId: "a", sheets: 100 },
      { paperTypeId: "b", sheets: -100 },
    ]);
  });

  it("covers switching 3P → Clients and Clients → 3P", () => {
    expect(paperCorrections(m(["a", 100], ["b", 40]), m())).toEqual([
      { paperTypeId: "a", sheets: 100 },
      { paperTypeId: "b", sheets: 40 },
    ]);
    expect(paperCorrections(m(), m(["a", 60]))).toEqual([{ paperTypeId: "a", sheets: -60 }]);
  });
});
