/**
 * Adult age gate — completed UTC years (mathematical truth freeze §5.1).
 *
 * Leap-day DOB in non-leap asOf years: anniversary completes on Mar 1
 * (UTC Feb 28 still before day 29).
 *
 * Never uses Date.now() or local timezone components.
 */

export type UtcYmd = { year: number; month: number; day: number };

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonthUTC(year: number, month: number): number {
  if (month === 2) return isGregorianLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

export function parseDobUtc(dateOfBirth: string | null | undefined): UtcYmd | null {
  if (dateOfBirth == null || typeof dateOfBirth !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const year = Number(dateOfBirth.slice(0, 4));
  const month = Number(dateOfBirth.slice(5, 7));
  const day = Number(dateOfBirth.slice(8, 10));
  if (![year, month, day].every((n) => Number.isFinite(n) && Number.isInteger(n))) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (month === 2 && day === 29 && !isGregorianLeapYear(year)) return null;
  if (day > daysInMonthUTC(year, month)) return null;
  return { year, month, day };
}

export function utcYmd(asOfMs: number): UtcYmd | null {
  if (!Number.isFinite(asOfMs)) return null;
  const d = new Date(asOfMs);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function ymdGreater(a: UtcYmd, b: UtcYmd): boolean {
  if (a.year !== b.year) return a.year > b.year;
  if (a.month !== b.month) return a.month > b.month;
  return a.day > b.day;
}

/**
 * PRECONDITION: asOfMs already finite/parseable (§4.2 rank 1).
 * Returns null for any DOB/age failure → required_age_missing only.
 */
export function completedUtcYears(
  dateOfBirth: string | null | undefined,
  asOfMs: number,
): number | null {
  const dob = parseDobUtc(dateOfBirth);
  const asOf = utcYmd(asOfMs);
  if (dob == null || asOf == null) return null;
  if (ymdGreater(dob, asOf)) return null;
  let years = asOf.year - dob.year;
  if (asOf.month < dob.month || (asOf.month === dob.month && asOf.day < dob.day)) {
    years -= 1;
  }
  if (years < 0) return null;
  return years;
}

export function adultAgeOk(
  dateOfBirth: string | null | undefined,
  asOfMs: number,
): boolean {
  const years = completedUtcYears(dateOfBirth, asOfMs);
  if (years == null) return false;
  return years >= 20;
}
