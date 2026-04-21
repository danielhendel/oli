import { averageExpectedMonthlyWorkloadFromWeeklyBaseline } from "@/lib/data/workouts/strengthYearlyChartBaseline";

describe("averageExpectedMonthlyWorkloadFromWeeklyBaseline", () => {
  it("returns 0 for non-finite or negative weekly rates", () => {
    expect(averageExpectedMonthlyWorkloadFromWeeklyBaseline(Number.NaN, 2026)).toBe(0);
    expect(averageExpectedMonthlyWorkloadFromWeeklyBaseline(-1, 2026)).toBe(0);
  });

  it("equates weekly rate to calendar-month totals via avg(d_i/7 × w); 2026 non-leap February shortens yearly average", () => {
    const w = 7;
    const expected2026 =
      [
        w * (31 / 7),
        w * (28 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
      ].reduce((a, b) => a + b, 0) / 12;

    expect(averageExpectedMonthlyWorkloadFromWeeklyBaseline(w, 2026)).toBeCloseTo(expected2026, 10);
  });

  it("uses actual days per month for leap years (Feb 29)", () => {
    const w = 7;
    const expected2024 =
      [
        w * (31 / 7),
        w * (29 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
        w * (30 / 7),
        w * (31 / 7),
      ].reduce((a, b) => a + b, 0) / 12;

    expect(averageExpectedMonthlyWorkloadFromWeeklyBaseline(w, 2024)).toBeCloseTo(expected2024, 10);
  });
});
