import type { CanonicalEventListItem } from "@oli/contracts";
import type { DayKey } from "@/lib/ui/calendar/types";
import { enumerateDaysInclusive } from "@/lib/ui/calendar/dateUtils";

export type NutritionAnalyticsSummaryModel = {
  rangeStart: DayKey;
  rangeEnd: DayKey;
  totalEvents: number;
  /** Distinct calendar days in [rangeStart, rangeEnd] with ≥1 nutrition event. */
  activeDays: number;
  /** totalEvents / activeDays when activeDays > 0, else 0. */
  avgEventsPerActiveDay: number;
};

/**
 * Scoped analytics summary from canonical `nutrition` events only (no meal-level truth).
 */
export function buildNutritionAnalyticsSummaryModel(
  items: readonly CanonicalEventListItem[],
  rangeStart: DayKey,
  rangeEnd: DayKey,
): NutritionAnalyticsSummaryModel {
  const allowed = new Set(enumerateDaysInclusive(rangeStart, rangeEnd));
  const nutrition = items.filter((e) => e.kind === "nutrition" && allowed.has(e.day));
  const active = new Set<DayKey>();
  for (const e of nutrition) {
    active.add(e.day);
  }
  const activeDays = active.size;
  const totalEvents = nutrition.length;
  const avgEventsPerActiveDay =
    activeDays > 0 && Number.isFinite(totalEvents / activeDays) ? totalEvents / activeDays : 0;

  return {
    rangeStart,
    rangeEnd,
    totalEvents,
    activeDays,
    avgEventsPerActiveDay,
  };
}
