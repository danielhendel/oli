import type { TextStyle } from "react-native";
import type { ViewToken } from "react-native";

import type { MonthYear } from "@/lib/ui/calendar/dateUtils";

/** Matches Body / Strength calendar nav title — centered year. */
export const MODULE_CALENDAR_HEADER_YEAR_TEXT_STYLE: TextStyle = {
  fontSize: 22,
  fontWeight: "700",
  letterSpacing: -0.35,
};

/**
 * Picks the calendar year from the month row at the middle of the visible indices
 * (same heuristic as Body calendar when scrolling across months/years).
 */
export function headerYearFromViewableMonthItems<T extends { monthYear: MonthYear }>(
  viewableItems: ViewToken[],
  months: readonly T[],
): number | null {
  const indices = viewableItems
    .map((t) => t.index)
    .filter((i): i is number => typeof i === "number")
    .sort((a, b) => a - b);
  if (indices.length === 0) return null;
  const pick = indices[Math.floor(indices.length / 2)]!;
  const item = months[pick];
  return item?.monthYear.year ?? null;
}
