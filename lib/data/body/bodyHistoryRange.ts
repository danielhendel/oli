import { getTodayDayKey } from "@/lib/time/dayKey";

/**
 * Extra calendar days added to the raw-events `end` query bound (local YYYY-MM-DD).
 * Server interprets `end` as `endT23:59:59.999Z` (UTC end of that date), which can exclude
 * same-calendar-day samples in negative-offset timezones; +1 day keeps "today" inclusive.
 */
export const RAW_EVENTS_QUERY_END_DAY_BUFFER = 1;

/** Shared with weight chart / Body trends (not Strength). */
export type WeightRangeKey = "7D" | "30D" | "90D" | "6M" | "1Y" | "3Y" | "5Y" | "All";

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
export function resolveBodyHistoryQueryWindow(range: WeightRangeKey): { start: string; end: string } {
  const effective = range === "All" ? BODY_CHART_ALL_EFFECTIVE_RANGE : range;
  const bounds = rangeToStartEnd(effective);
  if (bounds === "all") {
    return rangeToStartEnd(BODY_CHART_ALL_EFFECTIVE_RANGE) as { start: string; end: string };
  }
  return bounds;
}
