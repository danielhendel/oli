import { getTodayDayKey } from "@/lib/time/dayKey";

/**
 * Extra calendar days added to the raw-events `end` query bound (local YYYY-MM-DD).
 * Server interprets `end` as `endT23:59:59.999Z` (UTC end of that date), which can exclude
 * same-calendar-day samples in negative-offset timezones; +1 day keeps "today" inclusive.
 */
export const RAW_EVENTS_QUERY_END_DAY_BUFFER = 1;

/** Shared with weight chart / Body trends (not Strength). */
export type WeightRangeKey = "7D" | "30D" | "90D" | "6M" | "1Y" | "YTD" | "3Y" | "5Y" | "All";

export type BodyHistoryQueryWindowOpts = {
  /**
   * When `range` is `YTD`, window is Jan 1 of this calendar year through `anchorDayKey` (+ end buffer).
   * Omit to use {@link getTodayDayKey} (rolling “today”).
   */
  anchorDayKey?: string;
};

/**
 * Body chart "All" maps to the same horizon as Apple Health body backfill
 * (`APPLE_HEALTH_BODY_BACKFILL_YEARS` in `runAppleHealthBodyBackfill.ts`).
 */
export const BODY_CHART_ALL_EFFECTIVE_RANGE: Exclude<WeightRangeKey, "All"> = "5Y";

function parseYmd(dayKey: string): number {
  const parts = dayKey.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d).getTime();
}

/** Local-calendar day arithmetic (YYYY-MM-DD labels). */
export function addDaysToDayKey(dayKey: string, delta: number): string {
  const d = new Date(parseYmd(dayKey));
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Calendar year-to-date window for `anchorDayKey` (local YYYY-MM-DD):
 * `[year-01-01, anchorDay + RAW_EVENTS_QUERY_END_DAY_BUFFER]` — same end-buffer rule as other bounded ranges.
 */
export function ytdBoundsForAnchorDay(anchorDayKey: string): { start: string; end: string } {
  const y = Number(anchorDayKey.slice(0, 4));
  const year = Number.isFinite(y) && y >= 1 ? y : Number(getTodayDayKey().slice(0, 4));
  const start = `${year}-01-01`;
  const end = addDaysToDayKey(anchorDayKey, RAW_EVENTS_QUERY_END_DAY_BUFFER);
  return { start, end };
}

/**
 * Rolling calendar window ending at `anchorDayKey` with the same `end` buffer as bounded raw-events queries
 * (mirrors {@link rangeToStartEnd} horizons, but anchored on the overview snapshot day instead of “today”).
 */
export function rollingLookbackWindowForAnchorDay(
  anchorDayKey: string,
  lookbackCalendarDays: number,
): { start: string; end: string } {
  const start = addDaysToDayKey(anchorDayKey, -lookbackCalendarDays);
  const end = addDaysToDayKey(anchorDayKey, RAW_EVENTS_QUERY_END_DAY_BUFFER);
  return { start, end };
}

/**
 * Calendar day window [start, end] for raw-events `start`/`end` query params, or `"all"` for legacy unbounded pagination.
 */
export function rangeToStartEnd(range: WeightRangeKey): { start: string; end: string } | "all" {
  if (range === "All") return "all";
  const today = getTodayDayKey();
  const end = addDaysToDayKey(today, RAW_EVENTS_QUERY_END_DAY_BUFFER);
  let start: string;
  switch (range) {
    case "7D":
      start = addDaysToDayKey(today, -7);
      break;
    case "30D":
      start = addDaysToDayKey(today, -30);
      break;
    case "90D":
      start = addDaysToDayKey(today, -90);
      break;
    case "6M":
      start = addDaysToDayKey(today, -182);
      break;
    case "1Y":
      start = addDaysToDayKey(today, -365);
      break;
    case "YTD":
      return ytdBoundsForAnchorDay(today);
    case "3Y":
      start = addDaysToDayKey(today, -1095);
      break;
    case "5Y":
      start = addDaysToDayKey(today, -1825);
      break;
    default:
      start = addDaysToDayKey(today, -30);
  }
  return { start, end };
}

/** Finite window for Body chart/trends (never unbounded). */
export function resolveBodyHistoryQueryWindow(
  range: WeightRangeKey,
  opts?: BodyHistoryQueryWindowOpts,
): { start: string; end: string } {
  const effective = range === "All" ? BODY_CHART_ALL_EFFECTIVE_RANGE : range;
  if (effective === "YTD") {
    const anchor = opts?.anchorDayKey ?? getTodayDayKey();
    return ytdBoundsForAnchorDay(anchor);
  }
  const bounds = rangeToStartEnd(effective);
  if (bounds === "all") {
    return rangeToStartEnd(BODY_CHART_ALL_EFFECTIVE_RANGE) as { start: string; end: string };
  }
  return bounds;
}
