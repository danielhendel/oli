/**
 * Presentation-only rules for Strength Analytics yearly chart value labels.
 *
 * Chart points use ISO month keys (`YYYY-MM`) from {@link buildTwelveMonthSkeleton}; `todayMonthKey`
 * is {@link monthKeyFromDay} for the builder's `todayDayKey`. Lexicographic order on `YYYY-MM`
 * matches chronological order across calendar years.
 *
 * - Future months (month key strictly after today): no numeric label (including zero-filled future).
 * - Past and current months: show a label only when {@link workoutCount} &gt; 0 (hide redundant zeros).
 */
export function shouldShowStrengthYearlyMonthValueLabel(
  monthKey: string,
  todayMonthKey: string,
  workoutCount: number,
): boolean {
  if (monthKey.length !== 7 || todayMonthKey.length !== 7) {
    return workoutCount > 0;
  }
  if (monthKey > todayMonthKey) return false;
  return workoutCount > 0;
}
