import { describe, expect, it } from "vitest";
import { compareValues, nextSort, sortRows } from "@/lib/sort";

const rows = [
  { name: "b", gsm: 100, date: "2082/02/25", qty: "1000" },
  { name: "A", gsm: 80, date: null, qty: "" },
  { name: "c", gsm: 9, date: "2082/10/01", qty: "250" },
];
type Key = keyof (typeof rows)[number];

describe("column sorting", () => {
  it("sorts numbers as numbers and text naturally, ignoring case", () => {
    const by = (key: Key, dir: "asc" | "desc") => sortRows(rows, { key, dir }, (r, k) => r[k]);
    expect(by("gsm", "asc").map((r) => r.gsm)).toEqual([9, 80, 100]);
    expect(by("name", "desc").map((r) => r.name)).toEqual(["c", "b", "A"]);
    expect(by("qty", "asc").map((r) => r.qty)).toEqual(["250", "1000", ""]);
  });

  it("keeps empty values last in both directions", () => {
    const by = (dir: "asc" | "desc") => sortRows(rows, { key: "date", dir }, (r, k) => r[k]);
    expect(by("asc").map((r) => r.date)).toEqual(["2082/02/25", "2082/10/01", null]);
    expect(by("desc").map((r) => r.date)).toEqual(["2082/10/01", "2082/02/25", null]);
  });

  it("compares arrays item by item", () => {
    expect(compareValues(["2082/02/25", 5], ["2082/02/25", 12])).toBeLessThan(0);
    expect(compareValues(["2082/02/26", 1], ["2082/02/25", 12])).toBeGreaterThan(0);
  });

  it("a new column sorts ascending, the same column flips", () => {
    expect(nextSort({ key: "a", dir: "desc" }, "b")).toEqual({ key: "b", dir: "asc" });
    expect(nextSort({ key: "a", dir: "asc" }, "a")).toEqual({ key: "a", dir: "desc" });
    expect(nextSort({ key: "a", dir: "desc" }, "a")).toEqual({ key: "a", dir: "asc" });
  });
});
