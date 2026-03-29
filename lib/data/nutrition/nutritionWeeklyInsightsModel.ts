import type { CanonicalEventListItem } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import { addCalendarDaysToDayKey, enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

export type NutritionWeeklyInsightKind = "trend" | "focus" | "consistency";

export type NutritionWeeklyInsightItem = {
  kind: NutritionWeeklyInsightKind;
  message: string;
};

export type NutritionWeeklyInsightsModel = {
  insights: readonly NutritionWeeklyInsightItem[];
  fallbackMessage: string;
};

const FALLBACK_QUIET = "Log nutrition on more days to see week-over-week patterns.";
const FALLBACK_NICE = "Nice consistency — keep building the habit.";

function daySetInRange(
  events: readonly CanonicalEventListItem[],
  rangeStart: DayKey,
  rangeEnd: DayKey,
): Set<DayKey> {
  const allowed = new Set(enumerateDaysInclusive(rangeStart, rangeEnd));
  const out = new Set<DayKey>();
  for (const e of events) {
    if (e.kind !== "nutrition") continue;
    if (allowed.has(e.day)) out.add(e.day);
  }
  return out;
}

/**
 * Deterministic, event-derived weekly insights (no meal-level truth).
 * Compares distinct logging days current week vs previous week.
 */
export function buildNutritionWeeklyInsightsModel(args: {
  currentWeekStart: DayKey;
  currentWeekEnd: DayKey;
  previousWeekStart: DayKey;
  previousWeekEnd: DayKey;
  nutritionEvents: readonly CanonicalEventListItem[];
}): NutritionWeeklyInsightsModel {
  const cur = daySetInRange(args.nutritionEvents, args.currentWeekStart, args.currentWeekEnd);
  const prev = daySetInRange(args.nutritionEvents, args.previousWeekStart, args.previousWeekEnd);
  const curN = cur.size;
  const prevN = prev.size;

  if (curN === 0 && prevN === 0) {
    return { insights: [], fallbackMessage: FALLBACK_QUIET };
  }

  const insights: NutritionWeeklyInsightItem[] = [];

  if (curN === 0 && prevN > 0) {
    insights.push({
      kind: "focus",
      message: `No nutrition logs yet this week — you logged on ${prevN} day${prevN === 1 ? "" : "s"} last week.`,
    });
  } else if (curN > 0 && prevN === 0) {
    insights.push({
      kind: "trend",
      message: "First week with nutrition logs in this window — solid start.",
    });
  } else if (prevN >= 2 && curN >= Math.ceil(prevN * 1.5)) {
    insights.push({
      kind: "trend",
      message: `More active than last week — ${curN} day${curN === 1 ? "" : "s"} with nutrition vs ${prevN} prior week.`,
    });
  } else if (prevN >= 2 && curN > 0 && curN <= Math.floor(prevN * 0.67)) {
    insights.push({
      kind: "trend",
      message: `Quieter week so far (${curN} day${curN === 1 ? "" : "s"} vs ${prevN} last week) — plenty of time to catch up.`,
    });
  }

  if (curN >= 5) {
    insights.push({
      kind: "consistency",
      message: `Strong rhythm: ${curN} days with nutrition logged this week.`,
    });
  } else if (curN >= 3 && prevN > 0 && curN >= prevN) {
    insights.push({
      kind: "consistency",
      message: "Steady logging week — matching or beating last week's coverage.",
    });
  }

  const dedup: NutritionWeeklyInsightItem[] = [];
  const seen = new Set<string>();
  for (const row of insights) {
    const k = `${row.kind}:${row.message}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(row);
    if (dedup.length >= 3) break;
  }

  return {
    insights: dedup,
    fallbackMessage: dedup.length > 0 ? FALLBACK_NICE : FALLBACK_QUIET,
  };
}

/** Helper for callers that anchor on today's week (Sunday–Saturday). */
export function previousWeekBoundsFromWeekStart(weekStart: DayKey): {
  previousWeekStart: DayKey;
  previousWeekEnd: DayKey;
} {
  const previousWeekStart = addCalendarDaysToDayKey(weekStart, -7);
  const previousWeekEnd = addCalendarDaysToDayKey(previousWeekStart, 6);
  return { previousWeekStart, previousWeekEnd };
}
