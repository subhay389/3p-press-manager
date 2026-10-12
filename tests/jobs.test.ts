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
    expect(sumPlates({ colorPlates: "", bwPlates: "", spotPlates: "" })).toBe("");
    expect(sumPlates({ colorPlates: "4", bwPlates: "", spotPlates: "1" })).toBe("5");
  });

  it("adds sheets for a paper type used in several sections", () => {
    const totals = sheetsByPaperType([
      { paperTypeId: "a", sheets: "100" },
      { paperTypeId: "a", sheets: 50 },
      { paperTypeId: "b", sheets: "" },
      { paperTypeId: "", sheets: "10" },
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

  it("keeps a 3P section with its paper type and drops typed text", () => {
    const r = jobSchema.parse(
      formInput((v) => {
        v.sections.A = { ...v.sections.A, paperTypeId: "pt1", category: "a/b", sheets: "5200", format: "1", printStyle: "OS" };
      }),
    );
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0]).toMatchObject({
      section: "A",
      paperTypeId: "pt1",
      category: null,
      sheets: 5200,
      format: 1,
      printStyle: "OS",
      tally: null,
    });
  });

  it("unlinks paper types and normalizes text for client paper", () => {
    const r = jobSchema.parse(
      formInput((v) => {
        v.paperStock = "CLIENT";
        v.sections.A = { ...v.sections.A, paperTypeId: "pt1", category: "a/b", gsm: "230", size: "525 X 740", sheets: "5200" };
      }),
    );
    expect(r.sections[0]).toMatchObject({ paperTypeId: null, category: "A/B", gsm: 230, size: "525x740" });
  });

  it("requires a paper type and sheets together on 3P jobs", () => {
    const noType = jobSchema.safeParse(formInput((v) => (v.sections.B.sheets = "100")));
    expect(noType.error?.issues[0]?.message).toBe("No 3P paper matches the category, GSM and size for B. Inside Color Paper");
    const noSheets = jobSchema.safeParse(formInput((v) => (v.sections.C.paperTypeId = "pt1")));
    expect(noSheets.error?.issues[0]?.message).toBe("Enter No. of Sheets for C. Inside Paper");
  });

  it("only allows format 32 for inside sections", () => {
    expect(jobSchema.safeParse(formInput((v) => (v.sections.A.format = "32"))).success).toBe(false);
    expect(jobSchema.safeParse(formInput((v) => (v.sections.B.format = "32"))).success).toBe(true);
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
