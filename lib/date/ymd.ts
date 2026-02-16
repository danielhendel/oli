// lib/date/ymd.ts
// Robust YMD helpers (UTC-based).

function toYMDUTC(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  
  /** Strictly parse YYYY-MM-DD into [y, m, d] (numbers). Throws on invalid input. */
  export function parseYMDStrict(ymd: string): [number, number, number] {
    const parts = ymd.split("-");
    if (parts.length !== 3) throw new Error(`Invalid ymd: ${ymd}`);
    const [ys, ms, ds] = parts as [string, string, string];
    const y = Number.parseInt(ys, 10);
    const m = Number.parseInt(ms, 10);
    const d = Number.parseInt(ds, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      throw new Error(`Invalid ymd numbers: ${ymd}`);
    }
    return [y, m, d];
  }
  
  /** Convert YMD to a UTC Date at midnight. */
  export function ymdToUTCDate(ymd: string): Date {
    const [y, m, d] = parseYMDStrict(ymd);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  
  /** Add N days (can be negative) to a YMD string. */
  export function addDaysYMD(ymd: string, deltaDays: number): string {
    const dt = ymdToUTCDate(ymd);
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    return toYMDUTC(dt);
  }
  
  /** Today's date in YMD (UTC). */
  export function todayYMD(): string {
    return toYMDUTC(new Date());
  }
  
  /** Human-friendly "Mon, Sep 8" for a YMD. */
  export function formatYMDHuman(ymd: string): string {
    const dt = ymdToUTCDate(ymd);
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dow = DOW[dt.getUTCDay()];
    const mon = MON[dt.getUTCMonth()];
    const day = dt.getUTCDate();
    return `${dow}, ${mon} ${day}`;
  }
  