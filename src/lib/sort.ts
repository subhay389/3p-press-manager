// Client-side column sorting for the list pages (Job Records, Paper – 3P, Paper – Client).

export type SortDir = "asc" | "desc";
export type Sort<K extends string> = { key: K; dir: SortDir };
/** A value to sort by. Arrays compare item by item (e.g. date, then job no). */
export type SortValue = string | number | null | undefined | SortValue[];

const text = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function isEmpty(v: SortValue) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** Ascending compare. Numbers compare as numbers, text naturally ("9" before "10"). */
export function compareValues(a: SortValue, b: SortValue): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const c = compareValues(a[i], b[i]);
      if (c !== 0) return c;
    }
    return 0;
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  return text.compare(String(a), String(b));
}

/**
 * Rows sorted by `sort` (a new array; ties keep their order). Empty values go last
 * in both directions, so blanks never crowd the top of the list.
 */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: Sort<K>,
  value: (row: T, key: K) => SortValue,
): T[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return rows
    .map((row) => ({ row, v: value(row, sort.key) }))
    .sort((a, b) => {
      const ea = isEmpty(a.v);
      const eb = isEmpty(b.v);
      if (ea || eb) return Number(ea) - Number(eb);
      return sign * compareValues(a.v, b.v);
    })
    .map((x) => x.row);
}

/** Clicking a header: a new column sorts ascending, the sorted one flips direction. */
export function nextSort<K extends string>(current: Sort<K>, key: K): Sort<K> {
  if (current.key !== key) return { key, dir: "asc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}
