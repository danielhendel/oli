/**
 * Shared Labs display helpers for source-truth filtering and calendar dates.
 * Never treat genuine current_result inequalities (e.g. Mercury <4) as reference.
 */

export function isLabReferenceLikeDisplayRow(args: {
  sourceValueRole?: string | null | undefined;
  rawValueText?: string | null | undefined;
  comparator?: string | null | undefined;
}): boolean {
  const role = args.sourceValueRole;
  if (
    role === "reference_optimal" ||
    role === "reference_moderate" ||
    role === "reference_high" ||
    role === "reference_general" ||
    role === "historical_result"
  ) {
    return true;
  }
  // Explicit current results — including censored inequalities — are displayable.
  if (role === "current_result") return false;

  // Legacy rows without a role: suppress inequality-shaped text (old threshold leaks).
  const raw = (args.rawValueText ?? "").trim();
  const cmp = args.comparator;
  if (cmp === "lt" || cmp === "lte" || cmp === "gt" || cmp === "gte") return true;
  if (/^[<>≤≥]/.test(raw) || /^(?:<=|>=)/.test(raw)) return true;
  return false;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Format a Labs source calendar date without device-timezone day shift.
 * Uses the YYYY-MM-DD prefix of an ISO string (UTC wall fields from Quest parse).
 */
export function formatLabSourceCalendarDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return null;
    // Fallback: force UTC calendar parts.
    const d = new Date(ms);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}
