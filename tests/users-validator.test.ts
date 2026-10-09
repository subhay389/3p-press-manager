import { describe, expect, it } from "vitest";
import { addUserSchema } from "@/lib/validators/users";

describe("addUserSchema", () => {
  it("trims and lowercases the email, and turns a blank name into null", () => {
    const r = addUserSchema.parse({ email: "  Ram.Sharma@Gmail.com ", name: "  ", role: "STAFF" });
    expect(r).toEqual({ email: "ram.sharma@gmail.com", name: null, role: "STAFF" });
  });

  it("rejects an invalid email with a friendly message", () => {
    const r = addUserSchema.safeParse({ email: "not-an-email", name: "", role: "ADMIN" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Enter a valid email address");
  });

  it("rejects unknown roles", () => {
    expect(addUserSchema.safeParse({ email: "a@b.co", name: "", role: "OWNER" }).success).toBe(false);
  });
});
