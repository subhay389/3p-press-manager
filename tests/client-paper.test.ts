import { describe, expect, it } from "vitest";
import { clientBalanceSheets } from "@/lib/paper";
import { clientPaperSchema } from "@/lib/validators/client-paper";

const row = (patch: Record<string, string> = {}) => ({
  date: "2082/09/23",
  client: " KM Printers ",
  gsm: "",
  category: "",
  size: "",
  packets: "",
  sheets: "",
  cutJob: "",
  cutJobNo: "",
  cutPackets: "",
  cutSheets: "",
  balancePackets: "",
  remarks: "",
  ...patch,
});

describe("clientPaperSchema", () => {
  it("needs only a date and client; blanks become null", () => {
    const r = clientPaperSchema.parse(row());
    expect(r.client).toBe("KM Printers");
    expect(r.sheets).toBeNull();
    expect(r.cutJobNo).toBeNull();
  });

  it("normalizes category and size like 3P paper, keeps job no as text", () => {
    const r = clientPaperSchema.parse(
      row({ category: "tc", size: "25 X 36", gsm: "300", sheets: "10000", cutJobNo: "1941/1942" }),
    );
    expect(r).toMatchObject({ category: "TC", size: "25x36", gsm: 300, sheets: 10000, cutJobNo: "1941/1942" });
  });

  it("rejects a missing client and a bad date", () => {
    expect(clientPaperSchema.safeParse(row({ client: " " })).success).toBe(false);
    expect(clientPaperSchema.safeParse(row({ date: "2082/13/40" })).success).toBe(false);
  });
});

describe("clientBalanceSheets", () => {
  it("is received − cut, null when nothing was received", () => {
    expect(clientBalanceSheets(10000, 10000)).toBe(0);
    expect(clientBalanceSheets(500, null)).toBe(500);
    expect(clientBalanceSheets(420, 450)).toBe(-30);
    expect(clientBalanceSheets(null, 100)).toBeNull();
  });
});
