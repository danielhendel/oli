import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockTxSet = jest.fn();
const mockNodeWhere = jest.fn();

jest.mock("../../db", () => {
  const nodeRef = { __ref: "node" };
  const mapRef = { __ref: "map" };
  return {
    db: {
      runTransaction: jest.fn(async (fn: (t: { get: jest.Mock; set: jest.Mock }) => Promise<void>) => {
        const tx = { get: jest.fn(async () => ({ exists: false, data: () => ({}) })), set: mockTxSet };
        await fn(tx);
      }),
    },
    FieldValue: { serverTimestamp: jest.fn(() => ({ __ts: true })) },
    foodGraphNodesCollection: jest.fn(() => ({
      doc: jest.fn(() => nodeRef),
      where: mockNodeWhere,
    })),
    foodGraphSourceMapCollection: jest.fn(() => ({ doc: jest.fn(() => mapRef) })),
  };
});

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import {
  foodGraphDocToSearchDto,
  queryFoodGraphByTokens,
  upsertFoodGraphFromSearchItem,
} from "../oliFoodGraph";

const baseItem: NutritionFoodSearchItemDto = {
  id: "open:upc:3017620422003",
  name: "Nutella",
  brand: "Ferrero",
  servingLabel: "15 g",
  caloriesKcal: 80.9,
  proteinG: 0.9,
  carbsG: 8.6,
  fatG: 4.6,
  barcode: "3017620422003",
  productType: "food",
  basis: "mass",
  per100g: { caloriesKcal: 539, proteinG: 6.3, carbsG: 57.5, fatG: 30.9 },
  servings: [{ id: "off_serving", label: "15 g", grams: 15, isDefault: true }],
  source: "open",
  confidence: 0.6,
  attributionRequired: true,
  processingClass: "nova4",
};

describe("oliFoodGraph foundation persistence", () => {
  beforeEach(() => {
    delete process.env.NUTRITION_FOOD_GRAPH_DISABLED;
    mockTxSet.mockReset();
    mockNodeWhere.mockReset();
  });

  it("upsert generates searchTokens and persists per100g/confidence/attribution/processingClass", async () => {
    await upsertFoodGraphFromSearchItem(baseItem, "open", "open:upc:3017620422003");

    const nodeWrite = mockTxSet.mock.calls.find(
      (c) => typeof c[1] === "object" && c[1] !== null && "searchTokens" in (c[1] as Record<string, unknown>),
    );
    expect(nodeWrite).toBeDefined();
    const doc = nodeWrite?.[1] as Record<string, unknown>;
    expect(doc.searchTokens).toEqual(expect.arrayContaining(["nutella", "ferrero"]));
    expect(doc.attributionRequired).toBe(true);
    expect(doc.confidence).toBe(0.6);
    expect(doc.processingClass).toBe("nova4");
    expect((doc.per100g as { caloriesKcal: number }).caloriesKcal).toBe(539);
    expect(Array.isArray(doc.servings)).toBe(true);
  });

  it("foodGraphDocToSearchDto round-trips the foundation fields", () => {
    const dto = foodGraphDocToSearchDto("oli:fg:upc:3017620422003", {
      name: "Nutella",
      brandName: "Ferrero",
      servingLabel: "15 g",
      barcode: "3017620422003",
      productType: "food",
      basis: "mass",
      macros: { caloriesKcal: 80.9, proteinG: 0.9, carbsG: 8.6, fatG: 4.6 },
      per100g: { caloriesKcal: 539, proteinG: 6.3, carbsG: 57.5, fatG: 30.9 },
      servings: [{ id: "off_serving", label: "15 g", grams: 15, isDefault: true }],
      source: "open",
      confidence: 0.6,
      attributionRequired: true,
      processingClass: "nova4",
    });
    expect(dto).not.toBeNull();
    expect(dto?.attributionRequired).toBe(true);
    expect(dto?.confidence).toBe(0.6);
    expect(dto?.source).toBe("open");
    expect(dto?.per100g?.caloriesKcal).toBe(539);
    expect((dto?.servings ?? []).length).toBe(1);
    expect(dto?.processingClass).toBe("nova4");
  });

  it("queryFoodGraphByTokens uses array-contains-any with capped tokens", async () => {
    const getMock = jest.fn(async () => ({
      docs: [
        {
          id: "oli:fg:v1:abc",
          data: () => ({ name: "Chicken breast", macros: { caloriesKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 }, servingLabel: "100 g" }),
        },
      ],
    }));
    mockNodeWhere.mockReturnValue({ limit: jest.fn(() => ({ get: getMock })) });

    const out = await queryFoodGraphByTokens(["chicken", "breast", "chicken", ""], 18);
    expect(mockNodeWhere).toHaveBeenCalledWith("searchTokens", "array-contains-any", ["chicken", "breast"]);
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("Chicken breast");
  });

  it("queryFoodGraphByTokens returns empty for no usable tokens", async () => {
    const out = await queryFoodGraphByTokens(["", "   "], 18);
    expect(out).toEqual([]);
    expect(mockNodeWhere).not.toHaveBeenCalled();
  });
});
