import {
  buildManualNutritionPayload,
  manualNutritionIdempotencyKey,
  localNutritionDayWindowIsoUtc,
} from "../manualNutrition";

describe("manualNutrition", () => {
  it("buildManualNutritionPayload is stable for same inputs", () => {
    const a = buildManualNutritionPayload({
      dayKey: "2026-03-15",
      timeZone: "America/Los_Angeles",
      totalKcal: 2000,
      proteinG: 100,
      carbsG: 200,
      fatG: 60,
    });
    const b = buildManualNutritionPayload({
      dayKey: "2026-03-15",
      timeZone: "America/Los_Angeles",
      totalKcal: 2000,
      proteinG: 100,
      carbsG: 200,
      fatG: 60,
    });
    expect(a).toEqual(b);
  });

  it("manualNutritionIdempotencyKey is deterministic", () => {
    const payload = buildManualNutritionPayload({
      dayKey: "2026-03-15",
      timeZone: "UTC",
      totalKcal: 1500,
      proteinG: 90,
      carbsG: 180,
      fatG: 50,
      fiberG: 20,
    });
    expect(manualNutritionIdempotencyKey(payload)).toBe(manualNutritionIdempotencyKey(payload));
  });

  it("localNutritionDayWindowIsoUtc end is after start", () => {
    const w = localNutritionDayWindowIsoUtc("2026-06-01", "UTC");
    expect(Date.parse(w.end)).toBeGreaterThan(Date.parse(w.start));
  });
});
