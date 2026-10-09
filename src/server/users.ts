"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { addUserSchema, roleSchema } from "@/lib/validators/users";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const PATH = "/settings/users";

export async function addUser(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = addUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, name, role } = parsed.data;

  try {
    await db.allowedUser.create({ data: { email, name, role } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `${email} already has access.` };
    }
    throw e;
  }
  revalidatePath(PATH);
  return { ok: true, message: `${email} can now sign in as ${roleLabel(role)}.` };
}

export async function setUserRole(id: string, role: unknown): Promise<ActionResult> {
  const me = await assertAdmin();
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "Invalid role" };

  return db.$transaction(async (tx) => {
    const user = await tx.allowedUser.findUnique({ where: { id } });
    if (!user) return { ok: false, error: "That user no longer exists." };
    if (user.email === me) {
      return { ok: false, error: "You can't change your own role. Ask another admin." };
    }
    if (user.role === "ADMIN" && parsedRole.data === "STAFF" && (await adminCount(tx)) <= 1) {
      return { ok: false, error: "There must always be at least one admin." };
    }
    await tx.allowedUser.update({ where: { id }, data: { role: parsedRole.data } });
    revalidatePath(PATH);
    return { ok: true, message: `${user.email} is now ${roleLabel(parsedRole.data)}.` };
  });
}

export async function removeUser(id: string): Promise<ActionResult> {
  const me = await assertAdmin();

  return db.$transaction(async (tx) => {
    const user = await tx.allowedUser.findUnique({ where: { id } });
    if (!user) return { ok: false, error: "That user no longer exists." };
    if (user.email === me) {
      return { ok: false, error: "You can't remove yourself. Ask another admin." };
    }
    if (user.role === "ADMIN" && (await adminCount(tx)) <= 1) {
      return { ok: false, error: "There must always be at least one admin." };
    }
    await tx.allowedUser.delete({ where: { id } });
    revalidatePath(PATH);
    return { ok: true, message: `${user.email} can no longer sign in.` };
  });
}

function adminCount(tx: Prisma.TransactionClient) {
  return tx.allowedUser.count({ where: { role: "ADMIN" } });
}

function roleLabel(role: Role) {
  return role === "ADMIN" ? "an admin" : "staff";
}
