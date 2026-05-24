import { computeActivityYearNavigationState } from "@/lib/data/activity/activityYearNavigation";

describe("computeActivityYearNavigationState", () => {
  it("treats the year of todayDayKey as the current year and disables Next", () => {
    const s = computeActivityYearNavigationState({
      todayDayKey: "2026-05-24",
      selectedYear: 2026,
    });
    expect(s.year).toBe(2026);
    expect(s.yearLabel).toBe("2026");
    expect(s.cardTitle).toBe("2026 Activity");
    expect(s.isCurrentYear).toBe(true);
    expect(s.canGoNext).toBe(false);
    expect(s.canGoPrevious).toBe(true);
    expect(s.previousYear).toBe(2025);
    expect(s.nextYear).toBeNull();
  });

  it("enables Next when viewing a past year and exposes the next-year integer", () => {
    const s = computeActivityYearNavigationState({
      todayDayKey: "2026-05-24",
      selectedYear: 2024,
    });
    expect(s.year).toBe(2024);
    expect(s.cardTitle).toBe("2024 Activity");
    expect(s.canGoNext).toBe(true);
    expect(s.nextYear).toBe(2025);
    expect(s.previousYear).toBe(2023);
    expect(s.isCurrentYear).toBe(false);
  });

  it("clamps future selectedYear to the current year (defense-in-depth)", () => {
    const s = computeActivityYearNavigationState({
      todayDayKey: "2026-05-24",
      selectedYear: 2099,
    });
    expect(s.year).toBe(2026);
    expect(s.canGoNext).toBe(false);
  });

  it("falls back to current year when selectedYear is not finite", () => {
    const s = computeActivityYearNavigationState({
      todayDayKey: "2026-05-24",
      selectedYear: Number.NaN,
    });
    expect(s.year).toBe(2026);
  });
});
