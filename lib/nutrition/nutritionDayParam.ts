import { isValidDayKey, type DayKey } from "@/lib/ui/calendar/types";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

/**
 * Resolve a route `day` param into a canonical {@link DayKey}.
 *
 * The selected day is the source of truth across the nutrition logging flow
 * (Overview → Log Hub → Search → Scan → Food Detail → Supplements → Meals).
 * We only fall back to "today" when no valid day was supplied — never silently
 * when a day is present.
 */
export function resolveNutritionDayParam(raw: string | string[] | undefined): DayKey {
  const d = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
  return isValidDayKey(d) ? d : getTodayDayKeyLocal();
}

/** True when a valid, explicit day param was supplied (not a today fallback). */
export function hasExplicitDayParam(raw: string | string[] | undefined): boolean {
  const d = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
  return isValidDayKey(d);
}
