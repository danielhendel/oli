import { buildTrackedMealNutritionPayload, trackedMealNutritionIdempotencyKey } from "../trackedMealNutritionPayload";
import { computeFoodHash } from "../normalizeFoodName";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

const sampleFood: NutritionFoodSearchItemDto = {
  id: "test_food",
  name: "Test apple",
  servingLabel: "1 medium",
  caloriesKcal: 100,
  proteinG: 1,
  carbsG: 25,
  fatG: 0.5,
  sugarG: 19,
  sodiumMg: 2,
};

describe("trackedMealNutritionPayload", () => {
  it("builds meal-scoped payload with scaled macros and preserves providerResponse on raw shape only", () => {
    const payload = buildTrackedMealNutritionPayload({
      dayKey: "2026-04-29",
      timeZone: "America/New_York",
      observedAtIso: "2026-04-29T15:30:00.000Z",
      food: sampleFood,
      servingMultiplier: 2,
      nutritionIngestSource: "search",
      providerResponse: { demo: true },
    });

    expect(payload.logScope).toBe("meal");
    expect(payload.nutritionIngestSource).toBe("search");
    expect(payload.externalFoodId).toBe("test_food");
    expect(payload.totalKcal).toBe(200);
    expect(payload.proteinG).toBe(2);
    expect(payload.carbsG).toBe(50);
    expect(payload.fatG).toBe(1);
    expect(payload.sugarG).toBe(38);
    expect(payload.sodiumMg).toBe(4);
    expect(payload.providerResponse).toEqual({ demo: true });
    expect(payload.foodHash).toBe(
      computeFoodHash({
        name: sampleFood.name,
        brand: sampleFood.brand ?? null,
        externalFoodId: sampleFood.id,
      }),
    );
  });

  it("produces stable idempotency keys for identical meal intents", () => {
    const a = buildTrackedMealNutritionPayload({
      dayKey: "2026-04-29",
      timeZone: "UTC",
      observedAtIso: "2026-04-29T12:00:00.000Z",
      food: sampleFood,
      servingMultiplier: 1,
      nutritionIngestSource: "barcode",
      providerResponse: { x: 1 },
    });
    const b = { ...a };
    expect(trackedMealNutritionIdempotencyKey(a)).toBe(trackedMealNutritionIdempotencyKey(b));
  });

  it("includes mealSlot in idempotency key when set", () => {
    const base = buildTrackedMealNutritionPayload({
      dayKey: "2026-04-29",
      timeZone: "UTC",
      observedAtIso: "2026-04-29T12:00:00.000Z",
      food: sampleFood,
      servingMultiplier: 1,
      nutritionIngestSource: "search",
      providerResponse: {},
      mealSlot: "breakfast",
    });
    const dinner = buildTrackedMealNutritionPayload({
      dayKey: "2026-04-29",
      timeZone: "UTC",
      observedAtIso: "2026-04-29T12:00:00.000Z",
      food: sampleFood,
      servingMultiplier: 1,
      nutritionIngestSource: "search",
      providerResponse: {},
      mealSlot: "dinner",
    });
    expect(trackedMealNutritionIdempotencyKey(base)).not.toBe(trackedMealNutritionIdempotencyKey(dinner));
  });

  it("changes idempotency key when serving multiplier changes", () => {
    const a = buildTrackedMealNutritionPayload({
      dayKey: "2026-04-29",
      timeZone: "UTC",
      observedAtIso: "2026-04-29T12:00:00.000Z",
      food: sampleFood,
      servingMultiplier: 1,
      nutritionIngestSource: "search",
      providerResponse: {},
    });
    const b = buildTrackedMealNutritionPayload({
      dayKey: "2026-04-29",
      timeZone: "UTC",
      observedAtIso: "2026-04-29T12:00:00.000Z",
      food: sampleFood,
      servingMultiplier: 2,
      nutritionIngestSource: "search",
      providerResponse: {},
    });
    expect(trackedMealNutritionIdempotencyKey(a)).not.toBe(trackedMealNutritionIdempotencyKey(b));
  });
});
