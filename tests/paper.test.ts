import { describe, expect, it } from "vitest";
import { normalizeCategory, normalizeClient, normalizeSize, paperHref, samePaperType } from "@/lib/paper";
import { addPaperSchema } from "@/lib/validators/paper";

describe("paper type normalization", () => {
  it("normalizes size and category", () => {
    expect(normalizeSize(" 25 X 36 ")).toBe("25x36");
    expect(normalizeSize("25×36")).toBe("25x36");
    expect(normalizeCategory(" a/b ")).toBe("A/B");
  });

  it("treats spelling variants as the same paper type", () => {
    expect(
      samePaperType({ category: "a/b", gsm: 250, size: "24 X 36" }, { category: "A/B", gsm: 250, size: "24x36" }),
    ).toBe(true);
  });
});

describe("addPaperSchema", () => {
  const base = { category: "a/b", gsm: "250", size: "24 x 36", date: "2083/06/22", sheets: "1500" };

  it("parses form strings into clean values", () => {
    const r = addPaperSchema.parse({ ...base, packets: "", particulars: " Opening stock ", remarks: "" });
    expect(r).toMatchObject({ category: "A/B", gsm: 250, size: "24x36", sheets: 1500, packets: null, particulars: "Opening stock", remarks: null });
    expect(r.date.toISOString().slice(0, 10)).toBe("2026-10-08");
  });

  it("rejects zero sheets and bad dates", () => {
    expect(addPaperSchema.safeParse({ ...base, sheets: "0" }).success).toBe(false);
    expect(addPaperSchema.safeParse({ ...base, date: "2083/06/40" }).error?.issues[0]?.message).toBe(
      "Enter a valid BS date as YYYY/MM/DD",
    );
  });
});

describe("client paper", () => {
  it("matches client names regardless of case and spacing", () => {
    expect(normalizeClient("  Ram   Traders ")).toBe("ram traders");
    expect(normalizeClient("RAM TRADERS")).toBe(normalizeClient("ram traders"));
  });

  it("links each stock to its own ledger page", () => {
    expect(paperHref({ id: "p1", clientKey: "" })).toBe("/paper/press/p1");
    expect(paperHref({ id: "p2", clientKey: "ram traders" })).toBe("/paper/client/p2");
  });
});

describe("addPaperSchema particulars", () => {
  const base = { category: "a/b", gsm: "250", size: "24x36", date: "2083/06/22", sheets: "1500" };

  it("is required for 3P paper and optional for client paper", () => {
    expect(addPaperSchema.safeParse({ ...base, particulars: " " }).error?.issues[0]?.message).toBe("Enter the particulars");
    expect(addPaperSchema.safeParse({ ...base, client: "Ram Traders", particulars: "" }).success).toBe(true);
  });
});
