// lib/onboarding/dateOfBirthParts.ts
/**
 * Calendar date-of-birth parts without timezone rollover.
 * Validates Month / Day / Year explicitly and emits canonical YYYY-MM-DD.
 */

export type DateOfBirthParts = {
  month: string;
  day: string;
  year: string;
};

export type DateOfBirthPartsResult =
  | { ok: true; iso: string; month: number; day: number; year: number }
  | { ok: false; error: string };

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

/** Local calendar today as Y/M/D (device local, not UTC). */
export function todayLocalYmdParts(): { year: number; month: number; day: number } {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Split a canonical YYYY-MM-DD into display parts without Date timezone shift.
 */
export function splitCanonicalDateOfBirth(iso: string): DateOfBirthParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return {
    year: String(year),
    month: String(month),
    day: String(day),
  };
}

export function validateDateOfBirthParts(parts: DateOfBirthParts): DateOfBirthPartsResult {
  const monthRaw = digitsOnly(parts.month);
  const dayRaw = digitsOnly(parts.day);
  const yearRaw = digitsOnly(parts.year);

  if (!monthRaw || !dayRaw || !yearRaw) {
    return { ok: false, error: "Enter a valid date of birth." };
  }
  if (yearRaw.length !== 4) {
    return { ok: false, error: "Enter a valid date of birth." };
  }

  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "Enter a valid date of birth." };
  }
  if (!Number.isInteger(day) || day < 1) {
    return { ok: false, error: "Enter a valid date of birth." };
  }
  if (!Number.isInteger(year) || year < 1) {
    return { ok: false, error: "Enter a valid date of birth." };
  }

  const maxDay = daysInMonth(year, month);
  if (day > maxDay) {
    return { ok: false, error: "Enter a valid date of birth." };
  }

  const today = todayLocalYmdParts();
  if (
    year > today.year ||
    (year === today.year && month > today.month) ||
    (year === today.year && month === today.month && day > today.day)
  ) {
    return { ok: false, error: "Date of birth can’t be in the future." };
  }

  const iso = `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
  return { ok: true, iso, month, day, year };
}

/** Sanitize typed month/day/year input (digits only, max length). */
export function sanitizeDobPartInput(
  part: "month" | "day" | "year",
  value: string,
): string {
  const digits = digitsOnly(value);
  if (part === "year") return digits.slice(0, 4);
  return digits.slice(0, 2);
}
