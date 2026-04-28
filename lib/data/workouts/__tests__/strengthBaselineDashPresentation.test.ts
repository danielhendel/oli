import { buildStrengthBaselineCardModel } from "@/lib/data/workouts/strengthBaselineCardModel";
import { strengthBaselineDashPresentationFromModel } from "@/lib/data/workouts/strengthBaselineDashPresentation";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";

describe("strengthBaselineDashPresentationFromModel", () => {
  it("returns no_model when model is null", () => {
    expect(strengthBaselineDashPresentationFromModel(null)).toEqual({ kind: "no_model" });
  });

  it("formats ready presentation with value and rating from baseline model", () => {
    const days: WorkoutCalendarDayLike[] = [];
    const m = buildStrengthBaselineCardModel({
      strengthCalendarDays: days,
      todayDayKey: "2026-04-14",
    });
    const r = strengthBaselineDashPresentationFromModel(m);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.valueDigits).toBe(m.avgWorkoutsPerWeek.toFixed(1));
      expect(r.valueDigits).not.toContain("/");
      expect(r.ratingLabel.length).toBeGreaterThan(0);
      expect(r.fillWidth01).toBeGreaterThanOrEqual(0);
      expect(r.fillWidth01).toBeLessThanOrEqual(1);
    }
  });
});
