/**
 * Presentation-only conversion from Strength Baseline {@link StrengthBaselineCardModel.avgWorkoutsPerWeek}
 * to a single vertical scale value comparable to calendar-month workout totals on the yearly chart.
 *
 * Semantics: Baseline is sessions/week over elapsed days; expected sessions in a calendar month with `D`
 * days at rate `w`/week is `w × (D / 7)` (same dimensionality as monthly bar totals).
 * The reference line uses the **average** of those 12 monthly expectations for `analyticsCalendarYear`
 * (handles Feb/leap years via actual month lengths).
 */
export function averageExpectedMonthlyWorkloadFromWeeklyBaseline(
  avgWorkoutsPerWeek: number,
  analyticsCalendarYear: number,
): number {
  if (!Number.isFinite(avgWorkoutsPerWeek) || avgWorkoutsPerWeek < 0) return 0;
  let sum = 0;
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const daysInMonth = new Date(analyticsCalendarYear, monthIndex + 1, 0).getDate();
    sum += avgWorkoutsPerWeek * (daysInMonth / 7);
  }
  return sum / 12;
}
