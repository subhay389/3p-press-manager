"use server";

import { Prisma } from "@/generated/prisma/client";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatSheets, normalizeClient, paperTypeLabel } from "@/lib/paper";
import {
  addPaperSchema,
  adjustStockSchema,
  updatePaperTypeSchema,
} from "@/lib/validators/paper";
import { adjustToBalance, recordReceipt, revalidatePaperPages } from "@/server/inventory";
import type { ActionResult } from "@/server/users";

function firstError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input";
}

/**
 * Records a receipt, creating the paper type first if it doesn't exist. With a
 * client it is that client's paper (Paper – Client), otherwise 3P stock.
 */
export async function addPaper(input: unknown): Promise<ActionResult> {
  const me = await assertAdmin();
  const parsed = addPaperSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { client, category, gsm, size, ...receipt } = parsed.data;
  const clientKey = client ? normalizeClient(client) : "";

  const { type, created } = await db.$transaction(async (tx) => {
    const existing = await tx.paperType.findUnique({
      where: { clientKey_category_gsm_size: { clientKey, category, gsm, size } },
    });
    const type =
      existing ?? (await tx.paperType.create({ data: { client, clientKey, category, gsm, size } }));
    await recordReceipt(tx, { ...receipt, paperTypeId: type.id, createdByEmail: me });
    return { type, created: !existing };
  });

  revalidatePaperPages();
  const label = `${type.client ? `${type.client}: ` : ""}${paperTypeLabel(type)}`;
  return {
    ok: true,
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

  revalidatePaperPages();
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
  const { id, client, ...fields } = parsed.data;

  const current = await db.paperType.findUnique({ where: { id }, select: { clientKey: true } });
  if (!current) return { ok: false, error: "This paper type no longer exists." };
  // 3P stock stays 3P; client paper keeps a client name (a typo in it can be fixed).
  const isClient = current.clientKey !== "";
  if (isClient && !client) return { ok: false, error: "Enter the client" };
  const owner = isClient ? { client, clientKey: normalizeClient(client!) } : {};

  try {
    await db.paperType.update({ where: { id }, data: { ...fields, ...owner } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `${paperTypeLabel(fields)} already exists${isClient ? " for this client" : ""}.` };
    }
    throw e;
  }
  revalidatePaperPages();
  return { ok: true, message: `Paper type changed to ${paperTypeLabel(fields)}.` };
}
