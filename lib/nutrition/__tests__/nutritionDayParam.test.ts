import { hasExplicitDayParam, resolveNutritionDayParam } from "@/lib/nutrition/nutritionDayParam";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

describe("resolveNutritionDayParam", () => {
  it("returns a valid day string unchanged", () => {
    expect(resolveNutritionDayParam("2026-03-15")).toBe("2026-03-15");
  });

  it("uses the first element of an array param", () => {
    expect(resolveNutritionDayParam(["2026-01-02", "2026-09-09"])).toBe("2026-01-02");
  });

  it("falls back to today for missing / invalid days", () => {
    const today = getTodayDayKeyLocal();
    expect(resolveNutritionDayParam(undefined)).toBe(today);
    expect(resolveNutritionDayParam("")).toBe(today);
    expect(resolveNutritionDayParam("not-a-day")).toBe(today);
    expect(resolveNutritionDayParam([])).toBe(today);
  });
});

describe("hasExplicitDayParam", () => {
  it("is true only for a valid explicit day", () => {
    expect(hasExplicitDayParam("2026-03-15")).toBe(true);
    expect(hasExplicitDayParam(undefined)).toBe(false);
    expect(hasExplicitDayParam("bad")).toBe(false);
  });
});
