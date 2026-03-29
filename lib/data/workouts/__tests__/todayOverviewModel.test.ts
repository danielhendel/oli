import { buildTodayOverviewModel } from "@/lib/data/workouts/todayOverviewModel";

describe("buildTodayOverviewModel", () => {
  it("returns available rows with clamped progress when snapshot values exist", () => {
    const out = buildTodayOverviewModel({
      day: "2026-03-27",
      steps: 12000,
      exerciseMinutes: 45,
      activeEnergyKcal: 650,
      restingHeartRateBpm: 55,
      workouts: [],
    });

    expect(out.rows[0].label).toBe("Steps");
    expect(out.rows[0].available).toBe(true);
    expect(out.rows[0].progress).toBe(1);
    expect(out.rows[1].label).toBe("Workout Min");
    expect(out.rows[1].progress).toBe(1);
    expect(out.rows[2].label).toBe("Estimated Calorie Burn");
    expect(out.rows[2].progress).toBe(1);
  });

  it("returns graceful unavailable rows when snapshot is null", () => {
    const out = buildTodayOverviewModel(null);

    expect(out.rows.map((r) => r.valueLabel)).toEqual(["—", "—", "—"]);
    expect(out.rows.every((r) => r.available === false)).toBe(true);
    expect(out.rows.every((r) => r.progress === 0)).toBe(true);
  });
});
