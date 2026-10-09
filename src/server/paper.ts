"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatSheets, paperTypeLabel } from "@/lib/paper";
import {
  addPaperSchema,
  adjustStockSchema,
  updatePaperTypeSchema,
} from "@/lib/validators/paper";
import { adjustToBalance, recordReceipt } from "@/server/inventory";
import type { ActionResult } from "@/server/users";

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input";
}

function revalidatePaper(paperTypeId?: string) {
  revalidatePath("/paper/press");
  if (paperTypeId) revalidatePath(`/paper/press/${paperTypeId}`);
}

/** Records a receipt, creating the paper type first if it doesn't exist. */
export async function addPaper(input: unknown): Promise<ActionResult & { paperTypeId?: string }> {
  const me = await assertAdmin();
  const parsed = addPaperSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { category, gsm, size, ...receipt } = parsed.data;

  const { paperTypeId, created } = await db.$transaction(async (tx) => {
    const existing = await tx.paperType.findUnique({
      where: { category_gsm_size: { category, gsm, size } },
    });
    const type = existing ?? (await tx.paperType.create({ data: { category, gsm, size } }));
    await recordReceipt(tx, { ...receipt, paperTypeId: type.id, createdByEmail: me });
    return { paperTypeId: type.id, created: !existing };
  });

  revalidatePaper(paperTypeId);
  const label = paperTypeLabel({ category, gsm, size });
  return {
    ok: true,
    paperTypeId,
    message: `${created ? "New paper type added. " : ""}${formatSheets(receipt.sheets)} sheets of ${label} recorded.`,
  };
}

export async function adjustStock(input: unknown): Promise<ActionResult> {
  const me = await assertAdmin();
  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { diff } = await db.$transaction((tx) =>
    adjustToBalance(tx, { ...parsed.data, createdByEmail: me }),
  );
  if (diff === 0) return { ok: false, error: "The balance is already that number." };

  revalidatePaper(parsed.data.paperTypeId);
  const sign = diff > 0 ? "+" : "−";
  return {
    ok: true,
    message: `Balance set to ${formatSheets(parsed.data.newBalance)} (${sign}${formatSheets(Math.abs(diff))}).`,
  };
}

export async function updatePaperType(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = updatePaperTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, ...fields } = parsed.data;

  try {
    await db.paperType.update({ where: { id }, data: fields });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `${paperTypeLabel(fields)} already exists.` };
    }
    throw e;
  }
  revalidatePaper(id);
  return { ok: true, message: `Paper type changed to ${paperTypeLabel(fields)}.` };
}
