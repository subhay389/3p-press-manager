import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "STAFF"]);

export const addUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  name: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || null),
  role: roleSchema,
});

export type AddUserInput = z.input<typeof addUserSchema>;
