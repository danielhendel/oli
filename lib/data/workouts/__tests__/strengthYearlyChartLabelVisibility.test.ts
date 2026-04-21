import { shouldShowStrengthYearlyMonthValueLabel } from "@/lib/data/workouts/strengthYearlyChartLabelVisibility";

describe("shouldShowStrengthYearlyMonthValueLabel", () => {
  it("hides labels for months strictly after todayMonthKey", () => {
    expect(shouldShowStrengthYearlyMonthValueLabel("2026-06", "2026-03", 0)).toBe(false);
    expect(shouldShowStrengthYearlyMonthValueLabel("2026-06", "2026-03", 5)).toBe(false);
  });

  it("shows labels for past months only when workoutCount > 0", () => {
    expect(shouldShowStrengthYearlyMonthValueLabel("2026-01", "2026-03", 0)).toBe(false);
    expect(shouldShowStrengthYearlyMonthValueLabel("2026-01", "2026-03", 4)).toBe(true);
  });

  it("shows labels for current month only when workoutCount > 0", () => {
    expect(shouldShowStrengthYearlyMonthValueLabel("2026-03", "2026-03", 0)).toBe(false);
    expect(shouldShowStrengthYearlyMonthValueLabel("2026-03", "2026-03", 2)).toBe(true);
  });

  it("uses lexicographic order consistent with chronological order across years", () => {
    expect(shouldShowStrengthYearlyMonthValueLabel("2026-08", "2027-05", 3)).toBe(true);
    expect(shouldShowStrengthYearlyMonthValueLabel("2028-01", "2027-05", 0)).toBe(false);
  });

  it("falls back to workoutCount > 0 when keys are non-canonical length", () => {
    expect(shouldShowStrengthYearlyMonthValueLabel("bad", "2026-03", 0)).toBe(false);
    expect(shouldShowStrengthYearlyMonthValueLabel("bad", "2026-03", 2)).toBe(true);
  });
});
