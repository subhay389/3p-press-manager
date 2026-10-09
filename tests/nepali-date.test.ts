import { describe, expect, it } from "vitest";
import { formatBs, parseBs, todayBs } from "@/lib/nepali-date";

describe("nepali-date", () => {
  it("converts BS to AD and back", () => {
    const ad = parseBs("2082/02/25");
    expect(ad?.toISOString().slice(0, 10)).toBe("2025-06-08");
    expect(formatBs(ad!)).toBe("2082/02/25");
  });

  it("accepts single-digit parts and dashes", () => {
    expect(parseBs("2083-6-1")?.toISOString().slice(0, 10)).toBe(
      parseBs("2083/06/01")?.toISOString().slice(0, 10),
    );
  });

  it("rejects days that don't exist and out-of-range years", () => {
    expect(parseBs("2082/02/40")).toBeNull();
    expect(parseBs("2082/13/01")).toBeNull();
    expect(parseBs("2200/01/01")).toBeNull();
    expect(parseBs("hello")).toBeNull();
  });

  it("gives today as a valid BS date", () => {
    expect(parseBs(todayBs())).not.toBeNull();
  });
});
