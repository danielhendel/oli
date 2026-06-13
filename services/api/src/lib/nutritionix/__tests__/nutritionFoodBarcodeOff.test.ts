import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

const mockNodeDocGet = jest.fn(async () => ({ exists: false, data: () => ({}) }));

jest.mock("../../../db", () => {
  const emptyQuery = { limit: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [] })) })) };
  return {
    db: {
      runTransaction: jest.fn(async (fn: (t: { get: jest.Mock; set: jest.Mock }) => Promise<void>) => {
        await fn({ get: jest.fn(async () => ({ exists: false })), set: jest.fn() });
      }),
    },
    FieldValue: { serverTimestamp: jest.fn(() => ({})) },
    userNutritionMetaStateDoc: jest.fn(() => ({ get: jest.fn(async () => ({ exists: false })) })),
    userPantryCollection: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [] })) })),
    foodGraphNodesCollection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: mockNodeDocGet, set: jest.fn() })),
      where: jest.fn(() => ({ where: jest.fn(() => emptyQuery), ...emptyQuery })),
    })),
    foodGraphSourceMapCollection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn(async () => ({ exists: false })), set: jest.fn() })) })),
  };
});

import { allowConsoleForThisTest } from "../../../../../../scripts/test/consoleGuard";
import {
  clearNutritionFoodReadCachesForTests,
  resolveNutritionFoodBarcode,
} from "../nutritionFoodReadService";

const ctx = { uid: "off_barcode_uid" };
const OFF_BARCODE = "3017620422003";

function offResponse(status: 1 | 0, product?: Record<string, unknown>): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(status === 1 ? { status: 1, product } : { status: 0 }),
  } as Response;
}

describe("resolveNutritionFoodBarcode — Open Food Facts flow", () => {
  beforeEach(() => {
    delete process.env.NUTRITION_FOOD_GRAPH_DISABLED; // graph enabled
    delete process.env.NUTRITION_OFF_DISABLED;
    process.env.NUTRITION_FOOD_PROVIDER = "dev";
    clearNutritionFoodReadCachesForTests();
    mockNodeDocGet.mockReset();
    mockNodeDocGet.mockResolvedValue({ exists: false, data: () => ({}) });
    allowConsoleForThisTest({ warn: [/open_food_facts_barcode_failed/] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NUTRITION_FOOD_PROVIDER;
  });

  it("graph hit: returns the persisted node without calling OFF", async () => {
    mockNodeDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        name: "Cached Nutella",
        brandName: "Ferrero",
        servingLabel: "15 g",
        barcode: OFF_BARCODE,
        source: "open",
        attributionRequired: true,
        macros: { caloriesKcal: 80.9, proteinG: 0.9, carbsG: 8.6, fatG: 4.6 },
        per100g: { caloriesKcal: 539, proteinG: 6.3, carbsG: 57.5, fatG: 30.9 },
        servings: [{ id: "off_serving", label: "15 g", grams: 15, isDefault: true }],
      }),
    });
    const fetchSpy = jest.spyOn(global, "fetch");

    const item = await resolveNutritionFoodBarcode(OFF_BARCODE, ctx);
    expect(item?.id).toBe(`oli:fg:upc:${OFF_BARCODE}`);
    expect(item?.attributionRequired).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("OFF hit: graph miss → OFF lookup → normalized node with attribution", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : String(input);
      if (!url.includes("openfoodfacts.org")) throw new Error(`unexpected url ${url}`);
      return offResponse(1, {
        code: OFF_BARCODE,
        product_name: "Nutella",
        brands: "Ferrero",
        nova_group: 4,
        rev: 5,
        serving_quantity: 15,
        serving_size: "15 g",
        nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
      });
    });

    const item = await resolveNutritionFoodBarcode(OFF_BARCODE, ctx);
    expect(item).not.toBeNull();
    expect(item?.id).toBe(`oli:fg:upc:${OFF_BARCODE}`);
    expect(item?.name).toBe("Nutella");
    expect(item?.source).toBe("open");
    expect(item?.attributionRequired).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("duplicate UPC: second scan is served from cache (no second OFF call) with same id", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async () =>
      offResponse(1, {
        code: OFF_BARCODE,
        product_name: "Nutella",
        brands: "Ferrero",
        nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
      }),
    );

    const first = await resolveNutritionFoodBarcode(OFF_BARCODE, ctx);
    const second = await resolveNutritionFoodBarcode(OFF_BARCODE, ctx);
    expect(first?.id).toBe(`oli:fg:upc:${OFF_BARCODE}`);
    expect(second?.id).toBe(first?.id);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("OFF miss: status 0 → null (existing not-found behavior)", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(offResponse(0));
    const item = await resolveNutritionFoodBarcode("0000000000000", ctx);
    expect(item).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("OFF disabled via env → no network, null", async () => {
    process.env.NUTRITION_OFF_DISABLED = "1";
    const fetchSpy = jest.spyOn(global, "fetch");
    const item = await resolveNutritionFoodBarcode("0000000000000", ctx);
    expect(item).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("OFF transport error degrades gracefully to null", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const item = await resolveNutritionFoodBarcode("0000000000000", ctx);
    expect(item).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
