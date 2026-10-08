import type { Role } from "@/generated/prisma/enums";

/** Where each role lands after signing in. */
export function landingPathFor(role: Role) {
  return role === "ADMIN" ? "/jobs/new" : "/jobs";
}
