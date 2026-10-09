"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientPaperSchema, updateClientPaperSchema } from "@/lib/validators/client-paper";
import type { ActionResult } from "@/server/users";

// Paper – Client: a standalone list, not linked to jobs or 3P stock (U3).

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function addClientPaper(input: unknown): Promise<ActionResult> {
  const me = await assertAdmin();
  const parsed = clientPaperSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  await db.clientPaperRecord.create({ data: { ...parsed.data, createdByEmail: me } });
  revalidatePath("/paper/client");
  return { ok: true, message: `Paper from ${parsed.data.client} recorded.` };
}

export async function updateClientPaper(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = updateClientPaperSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...data } = parsed.data;

  const { count } = await db.clientPaperRecord.updateMany({ where: { id }, data });
  if (count === 0) return { ok: false, error: "This entry no longer exists." };
  revalidatePath("/paper/client");
  return { ok: true, message: `Entry for ${data.client} saved.` };
}

export async function deleteClientPaper(id: string): Promise<ActionResult> {
  await assertAdmin();
  const record = await db.clientPaperRecord.findUnique({ where: { id }, select: { client: true } });
  if (!record) return { ok: false, error: "This entry no longer exists." };
  await db.clientPaperRecord.delete({ where: { id } });
  revalidatePath("/paper/client");
  return { ok: true, message: `Entry for ${record.client} deleted.` };
}
