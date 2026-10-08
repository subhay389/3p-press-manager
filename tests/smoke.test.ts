import { describe, expect, it } from "vitest";
import { landingPathFor } from "@/lib/roles";

describe("landingPathFor", () => {
  it("sends admins to Enter Job and staff to Job Records", () => {
    expect(landingPathFor("ADMIN")).toBe("/jobs/new");
    expect(landingPathFor("STAFF")).toBe("/jobs");
  });
});
