// lib/util/date.ts
// Small helpers for YYYY-MM-DD formatting and validation (UTC-safe).

export function toYMD(input: Date | number | string): string {
    // If it's already a YYYY-MM-DD string, return as-is (no TZ parsing).
    if (typeof input === "string") {
      if (isYMD(input)) return input;
    }
  
    const d =
      input instanceof Date
        ? input
        : new Date(input); // number (ms) or non-YMD string (e.g., ISO)
  
    if (Number.isNaN(d.getTime())) {
      throw new Error("toYMD: invalid date input");
    }
  
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  
  export function isYMD(s: string): boolean {
    // Basic guard: YYYY-MM-DD with simple range checks
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12) return false;
    if (d < 1 || d > 31) return false;
    return y > 1900 && y < 3000;
  }
  