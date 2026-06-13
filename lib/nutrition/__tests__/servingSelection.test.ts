import {
  buildServingOptions,
  defaultServingOption,
  isServingConvertible,
  resolveServing,
  type ServingOption,
} from "@/lib/nutrition/servingSelection";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

function food(partial: Partial<NutritionFoodSearchItemDto>): NutritionFoodSearchItemDto {
  return {
    id: "oli:fg:test",
    name: "Test",
    servingLabel: "1 serving",
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    ...partial,
  };
}

const eggs = food({
  id: "oli:fg:eggs",
  name: "Eggs",
  servingLabel: "1 large egg",
  caloriesKcal: 71.5,
  proteinG: 6.3,
  carbsG: 0.35,
  fatG: 4.75,
  basis: "mass",
  per100g: { caloriesKcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
  servings: [{ id: "egg", label: "1 large egg", grams: 50, unit: "piece", isDefault: true }],
});

const rice = food({
  id: "oli:fg:rice",
  name: "White rice (cooked)",
  servingLabel: "1 cup",
  caloriesKcal: 205.4,
  proteinG: 4.26,
  carbsG: 44.5,
  fatG: 0.44,
  basis: "mass",
  per100g: { caloriesKcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.28, fiberG: 0.4 },
  servings: [{ id: "cup", label: "1 cup cooked", grams: 158, unit: "cup", isDefault: true }],
});

const chicken = food({
  id: "oli:fg:chicken",
  name: "Chicken breast",
  servingLabel: "120 g",
  caloriesKcal: 198,
  proteinG: 37.2,
  carbsG: 0,
  fatG: 4.32,
  basis: "mass",
  per100g: { caloriesKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  servings: [{ id: "breast", label: "120 g", grams: 120, isDefault: true }],
});

const oliveOil = food({
  id: "oli:fg:olive-oil",
  name: "Olive oil",
  servingLabel: "1 tbsp",
  caloriesKcal: 119.34,
  proteinG: 0,
  carbsG: 0,
  fatG: 13.5,
  basis: "mass",
  per100g: { caloriesKcal: 884, proteinG: 0, carbsG: 0, fatG: 100 },
  servings: [{ id: "tbsp", label: "1 tbsp", grams: 13.5, unit: "tbsp", isDefault: true }],
});

const whey = food({
  id: "oli:fg:whey",
  name: "Whey protein",
  servingLabel: "1 scoop",
  caloriesKcal: 120,
  proteinG: 24,
  carbsG: 3,
  fatG: 1.5,
  productType: "supplement",
  basis: "mass",
  per100g: { caloriesKcal: 400, proteinG: 80, carbsG: 10, fatG: 5 },
  servings: [{ id: "scoop", label: "1 scoop", grams: 30, unit: "scoop", isDefault: true }],
});

function optionFor(f: NutritionFoodSearchItemDto, predicate: (o: ServingOption) => boolean): ServingOption {
  const found = buildServingOptions(f).find(predicate);
  if (!found) throw new Error("option not found");
  return found;
}

describe("servingSelection — convertibility & options", () => {
  it("detects convertible foods and exposes named servings + generic units", () => {
    expect(isServingConvertible(eggs)).toBe(true);
    const opts = buildServingOptions(eggs);
    expect(opts.some((o) => o.kind === "serving")).toBe(true);
    expect(opts.some((o) => o.kind === "unit" && o.unit === "g")).toBe(true);
    expect(opts.some((o) => o.kind === "unit" && o.unit === "oz")).toBe(true);
  });

  it("returns a single legacy option for foods without per-100g", () => {
    const legacy = food({ caloriesKcal: 100, servingLabel: "1 bar" });
    expect(isServingConvertible(legacy)).toBe(false);
    const opts = buildServingOptions(legacy);
    expect(opts).toHaveLength(1);
    expect(opts[0]!.kind).toBe("legacy");
    expect(defaultServingOption(legacy).kind).toBe("legacy");
  });

  it("defaults to the flagged default serving", () => {
    const def = defaultServingOption(eggs);
    expect(def.kind).toBe("serving");
    if (def.kind === "serving") expect(def.servingId).toBe("egg");
  });
});

describe("servingSelection — P0 serving examples", () => {
  it("3 eggs → 150 g, ×3, 214.5 kcal", () => {
    const opt = optionFor(eggs, (o) => o.kind === "serving" && o.servingId === "egg");
    const r = resolveServing(eggs, opt, 3);
    expect(r.grams).toBe(150);
    expect(r.servingMultiplier).toBeCloseTo(3, 5);
    expect(r.nutrition.caloriesKcal).toBeCloseTo(214.5, 1);
    expect(r.nutrition.proteinG).toBeCloseTo(18.9, 1);
    expect(r.servingConfidence).toBe(1);
  });

  it("150 g rice → 150 g, 195 kcal", () => {
    const opt = optionFor(rice, (o) => o.kind === "unit" && o.unit === "g");
    const r = resolveServing(rice, opt, 150);
    expect(r.grams).toBe(150);
    expect(r.nutrition.caloriesKcal).toBeCloseTo(195, 1);
    expect(r.servingMultiplier).toBeCloseTo(150 / 158, 5);
    expect(r.servingConfidence).toBe(1);
  });

  it("6 oz chicken → ~170 g, ~280.7 kcal", () => {
    const opt = optionFor(chicken, (o) => o.kind === "unit" && o.unit === "oz");
    const r = resolveServing(chicken, opt, 6);
    expect(r.grams).toBeCloseTo(170.1, 1);
    expect(r.nutrition.caloriesKcal).toBeCloseTo(280.66, 0);
    expect(r.servingConfidence).toBe(1);
  });

  it("1 tbsp olive oil → 13.5 g, ~119.3 kcal", () => {
    const opt = optionFor(oliveOil, (o) => o.kind === "serving" && o.servingId === "tbsp");
    const r = resolveServing(oliveOil, opt, 1);
    expect(r.grams).toBe(13.5);
    expect(r.nutrition.caloriesKcal).toBeCloseTo(119.34, 1);
    expect(r.servingMultiplier).toBeCloseTo(1, 5);
  });

  it("2 scoops whey → 60 g, ×2, 240 kcal", () => {
    const opt = optionFor(whey, (o) => o.kind === "serving" && o.servingId === "scoop");
    const r = resolveServing(whey, opt, 2);
    expect(r.grams).toBe(60);
    expect(r.servingMultiplier).toBeCloseTo(2, 5);
    expect(r.nutrition.caloriesKcal).toBeCloseTo(240, 1);
    expect(r.nutrition.proteinG).toBeCloseTo(48, 1);
  });
});

describe("servingSelection — generic unit fallback & legacy", () => {
  it("uses a 0.5-confidence fallback for unmatched household units", () => {
    const opt = optionFor(rice, (o) => o.kind === "unit" && o.unit === "slice");
    const r = resolveServing(rice, opt, 1);
    expect(r.servingConfidence).toBe(0.5);
    expect(r.grams).toBeGreaterThan(0);
  });

  it("legacy foods log by serving multiplier", () => {
    const legacy = food({ caloriesKcal: 100, proteinG: 5, carbsG: 10, fatG: 2, servingLabel: "1 bar" });
    const opt = buildServingOptions(legacy)[0]!;
    const r = resolveServing(legacy, opt, 2);
    expect(r.grams).toBeNull();
    expect(r.servingMultiplier).toBe(2);
    expect(r.nutrition.caloriesKcal).toBe(200);
    expect(r.nutrition.proteinG).toBe(10);
  });

  it("zero / invalid quantity yields zero nutrition", () => {
    const opt = defaultServingOption(eggs);
    const r = resolveServing(eggs, opt, 0);
    expect(r.grams).toBe(0);
    expect(r.nutrition.caloriesKcal).toBe(0);
  });
});
