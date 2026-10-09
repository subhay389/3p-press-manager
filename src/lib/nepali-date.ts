import NepaliDate from "nepali-date-converter";

// The only module that touches the BS converter. Business dates are stored as
// Postgres DATE columns, which Prisma returns as Date objects at UTC midnight,
// so all AD values here use UTC components.

const BS_PATTERN = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Stored AD date → "YYYY/MM/DD" in BS. */
export function formatBs(date: Date): string {
  const nd = NepaliDate.fromAD(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const { year, month, date: day } = nd.getBS();
  return `${year}/${pad(month + 1)}/${pad(day)}`;
}

/** "YYYY/MM/DD" (BS) → AD Date at UTC midnight, or null if not a real BS date. */
export function parseBs(input: string): Date | null {
  const m = BS_PATTERN.exec(input.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 32) return null;
  try {
    const nd = new NepaliDate(y, mo - 1, d);
    const bs = nd.getBS();
    // The converter rolls invalid days into the next month; reject those.
    if (bs.year !== y || bs.month !== mo - 1 || bs.date !== d) return null;
    const ad = nd.getAD();
    return new Date(Date.UTC(ad.year, ad.month, ad.date));
  } catch {
    return null; // outside the supported range (BS 2000–2090)
  }
}

/** Today in Nepal, as "YYYY/MM/DD" (BS). */
export function todayBs(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "2026-10-08"
  const [y, m, d] = parts.split("-").map(Number);
  return formatBs(new Date(Date.UTC(y, m - 1, d)));
}

/** Short AD label for a stored date, e.g. "8 Oct 2026". */
export function formatAd(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
