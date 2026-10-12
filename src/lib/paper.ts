// Paper type helpers shared by client and server.

/** Categories from the paper Job Card, offered as suggestions. */
export const DEFAULT_CATEGORIES = ["A/B", "A/P", "W/F", "DUP", "TC", "DB"] as const;

/** "a/b " → "A/B". Categories are compared and stored uppercase. */
export function normalizeCategory(input: string) {
  return input.trim().replace(/\s+/g, " ").toUpperCase();
}

/** "25 X 36" / "25×36" → "25x36". */
export function normalizeSize(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "").replace(/[×*]/g, "x");
}

export type PaperTypeLike = { category: string; gsm: number; size: string };

export function paperTypeLabel(p: PaperTypeLike) {
  return `${p.category} · ${p.gsm} · ${p.size}`;
}

export function samePaperType(a: PaperTypeLike, b: PaperTypeLike) {
  return (
    normalizeCategory(a.category) === normalizeCategory(b.category) &&
    a.gsm === b.gsm &&
    normalizeSize(a.size) === normalizeSize(b.size)
  );
}

export function formatSheets(n: number) {
  return n.toLocaleString("en-IN");
}

/**
 * Client name → the key client paper is matched on: "Ram  Traders " → "ram traders".
 * 3P stock has the key "".
 */
export function normalizeClient(input: string) {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Ledger page of a paper stock: Paper – 3P or Paper – Client. */
export function paperHref(p: { id: string; clientKey: string }) {
  return `/paper/${p.clientKey ? "client" : "press"}/${p.id}`;
}
