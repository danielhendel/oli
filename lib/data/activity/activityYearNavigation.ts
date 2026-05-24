import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Pure derivation of the Yearly Activity card year-nav state. Mirrors the role
 * `computeEnergyWeekNavigationState` plays for "This Week" — keeping nav rules outside React so they
 * are unit-testable in isolation.
 *
 * Rules:
 * - The current year is the one containing `todayDayKey` (local calendar).
 * - Previous is always enabled — historical years may be empty but the user is allowed to navigate
 *   back as far as they like.
 * - Next is disabled when the displayed year is already the current year.
 * - `previousYear` / `nextYear` are returned as plain numbers; `nextYear` is `null` on the current year.
 */
export type ActivityYearNavigationState = {
  /** Canonical 4-digit year currently displayed. */
  year: number;
  /** Header label such as `"2026"`. Plain numeric string for stable layout in the nav cluster. */
  yearLabel: string;
  /** Card title — e.g. `"2026 Activity"`. */
  cardTitle: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  /** Year integer for the previous-year handler target. */
  previousYear: number;
  /** Year integer for the next-year handler target, or `null` when on the current year. */
  nextYear: number | null;
  /** True when the displayed year matches the year of `todayDayKey`. */
  isCurrentYear: boolean;
};

function parseYearFromDayKey(dayKey: DayKey): number {
  return Number.parseInt(dayKey.slice(0, 4), 10);
}

export function computeActivityYearNavigationState(input: {
  todayDayKey: DayKey;
  selectedYear: number;
}): ActivityYearNavigationState {
  const { todayDayKey, selectedYear } = input;
  const currentYear = parseYearFromDayKey(todayDayKey);
  const clampedYear = Number.isFinite(selectedYear) ? Math.floor(selectedYear) : currentYear;
  const year = clampedYear > currentYear ? currentYear : clampedYear;
  const canGoNext = year < currentYear;
  return {
    year,
    yearLabel: String(year),
    cardTitle: `${year} Activity`,
    canGoPrevious: true,
    canGoNext,
    previousYear: year - 1,
    nextYear: canGoNext ? year + 1 : null,
    isCurrentYear: year === currentYear,
  };
}
