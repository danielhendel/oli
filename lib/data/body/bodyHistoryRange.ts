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
 * Body chart "All" for Weight remains the governed 5Y fetch window
 * (`APPLE_HEALTH_BODY_BACKFILL_YEARS`). Body Fat `All` is unbounded at the
 * trend/list layer — see `useBodyMetricTrends` / `useBodyCompositionLog`.
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
 * Local-calendar month arithmetic with day clamp (e.g. Jan 31 − 1 month → Dec 31;
 * Mar 31 − 1 month → Feb 28/29). Prefer this over approximating 6M ≈ 182 days.
 */
export function addMonthsToDayKey(dayKey: string, deltaMonths: number): string {
  const parts = dayKey.split("-").map(Number);
  const y0 = parts[0] ?? 0;
  const m0 = parts[1] ?? 1;
  const d0 = parts[2] ?? 1;
  const totalMonths = y0 * 12 + (m0 - 1) + deltaMonths;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths - y * 12; // 0-11
  const lastDay = new Date(y, m + 1, 0).getDate();
  const day = Math.min(d0, lastDay);
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** Local-calendar year arithmetic (leap-day safe via {@link addMonthsToDayKey}). */
export function addYearsToDayKey(dayKey: string, deltaYears: number): string {
  return addMonthsToDayKey(dayKey, deltaYears * 12);
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
 * Inclusive requested-period start dayKey for a finite range, anchored on `anchorDayKey`.
 * Matches chart/query lookback horizons (calendar months/years for 6M+).
 */
export function requestedStartDayKeyForAnchor(
  range: Exclude<WeightRangeKey, "All">,
  anchorDayKey: string,
): string {
  switch (range) {
    case "7D":
      return addDaysToDayKey(anchorDayKey, -7);
    case "30D":
      return addDaysToDayKey(anchorDayKey, -30);
    case "90D":
      return addDaysToDayKey(anchorDayKey, -90);
    case "6M":
      return addMonthsToDayKey(anchorDayKey, -6);
    case "1Y":
      return addYearsToDayKey(anchorDayKey, -1);
    case "YTD": {
      const y = Number(anchorDayKey.slice(0, 4));
      const year = Number.isFinite(y) && y >= 1 ? y : Number(getTodayDayKey().slice(0, 4));
      return `${year}-01-01`;
    }
    case "3Y":
      return addYearsToDayKey(anchorDayKey, -3);
    case "5Y":
      return addYearsToDayKey(anchorDayKey, -5);
    default:
      return addDaysToDayKey(anchorDayKey, -30);
  }
}

/**
 * Calendar day window [start, end] for raw-events `start`/`end` query params, or `"all"` for legacy unbounded pagination.
 */
export function rangeToStartEnd(range: WeightRangeKey): { start: string; end: string } | "all" {
  if (range === "All") return "all";
  const today = getTodayDayKey();
  const end = addDaysToDayKey(today, RAW_EVENTS_QUERY_END_DAY_BUFFER);
  if (range === "YTD") {
    return ytdBoundsForAnchorDay(today);
  }
  return {
    start: requestedStartDayKeyForAnchor(range, today),
    end,
  };
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
