import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

jest.mock("../../../db", () => {
  const chain = {
    limit: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [] })) })),
  };
  const col = {
    doc: jest.fn(() => ({ get: jest.fn(async () => ({ exists: false, data: () => ({}) })), set: jest.fn() })),
    where: jest.fn(() => chain),
  };
  return {
    db: {
      runTransaction: jest.fn(async (fn: (t: { get: jest.Mock; set: jest.Mock }) => Promise<void>) => {
        const tx = {
          get: jest.fn(async () => ({ exists: false })),
          set: jest.fn(),
        };
        await fn(tx);
      }),
    },
    FieldValue: { serverTimestamp: jest.fn(() => ({})) },
    userNutritionMetaStateDoc: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({ exists: false }),
    })),
    foodGraphNodesCollection: jest.fn(() => col),
    foodGraphSourceMapCollection: jest.fn(() => col),
    documentIdPath: "documentId",
  };
});

import { allowConsoleForThisTest } from "../../../../../../scripts/test/consoleGuard";
import {
  clearNutritionFoodReadCachesForTests,
  resolveNutritionFoodBarcode,
  resolveNutritionFoodDetail,
  resolveNutritionFoodSearch,
} from "../nutritionFoodReadService";

const testCtx = { uid: "test_nutrition_read_uid" };

describe("nutritionFoodReadService", () => {
  beforeEach(() => {
    process.env.NUTRITION_FOOD_GRAPH_DISABLED = "1";
    allowConsoleForThisTest({
      warn: [
        /nutritionix_credentials_missing/,
        /nutritionix_search_upstream_failure/,
        /nutritionix_search_fallback_dev/,
        /nutritionix_credentials_missing_fallback_dev/,
        /nutritionix_barcode_fallback_dev/,
      ],
    });
  });
  const origEnv = { ...process.env };

  beforeEach(() => {
    clearNutritionFoodReadCachesForTests();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("dev mode uses dev catalog without calling fetch", async () => {
    process.env.NUTRITION_FOOD_PROVIDER = "dev";
    const fetchSpy = jest.spyOn(global, "fetch");

    const res = await resolveNutritionFoodSearch("oats", testCtx);
    if ("ok" in res) throw new Error("unexpected failure union");
    expect(res.provider).toBe("dev_catalog");
    expect(res.items.some((i) => i.id === "dev_oats_40g")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("nutritionix mode without credentials returns not-configured", async () => {
    process.env.NUTRITION_FOOD_PROVIDER = "nutritionix";
    delete process.env.NUTRITIONIX_APP_ID;
    delete process.env.NUTRITIONIX_APP_KEY;

    const res = await resolveNutritionFoodSearch("chicken", testCtx);
    expect(res).toEqual({ ok: false, code: "NUTRITIONIX_NOT_CONFIGURED" });
  });

  it("hybrid uses Nutritionix when credentials exist and caches search", async () => {
    process.env.NUTRITION_FOOD_PROVIDER = "hybrid";
    process.env.NUTRITIONIX_APP_ID = "app";
    process.env.NUTRITIONIX_APP_KEY = "key";

    const instantBody = {
      branded: [
        {
          food_name: "Chicken breast",
          brand_name: "TestBrand",
          nix_item_id: "nix_chicken",
          nf_calories: 165,
          serving_qty: 100,
          serving_unit: "g",
        },
      ],
      common: [],
    };

    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : String(input);
      if (!url.includes("trackapi.nutritionix.com/v2/search/instant")) {
        throw new Error(`unexpected fetch url: ${url}`);
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify(instantBody),
      } as Response;
    });

    const a = await resolveNutritionFoodSearch("chicken", testCtx);
    const b = await resolveNutritionFoodSearch("chicken", testCtx);

    if ("ok" in a) throw new Error("unexpected failure union");
    expect(a.provider).toBe("nutritionix");
    expect(a.items.some((i) => i.id === "nutritionix:branded:nix_chicken")).toBe(true);
    expect(b).toEqual(a);

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await resolveNutritionFoodSearch("beef", testCtx);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    fetchSpy.mockRestore();
  });

  it("nutritionix-only mode surfaces upstream failure without dev fallback", async () => {
    process.env.NUTRITION_FOOD_PROVIDER = "nutritionix";
    process.env.NUTRITIONIX_APP_ID = "app";
    process.env.NUTRITIONIX_APP_KEY = "key";

    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ message: "upstream" }),
    } as Response);

    const res = await resolveNutritionFoodSearch("anything", testCtx);
    expect(res).toEqual({ ok: false, code: "NUTRITIONIX_UPSTREAM" });
    fetchSpy.mockRestore();
  });

  it("hybrid falls back to dev catalog when Nutritionix errors", async () => {
    process.env.NUTRITION_FOOD_PROVIDER = "hybrid";
    process.env.NUTRITIONIX_APP_ID = "app";
    process.env.NUTRITIONIX_APP_KEY = "key";

    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ message: "upstream" }),
    } as Response);

    const res = await resolveNutritionFoodSearch("oats", testCtx);
    if ("ok" in res) throw new Error("unexpected failure union");
    expect(res.provider).toBe("dev_catalog");
    expect(res.items.some((i) => i.id === "dev_oats_40g")).toBe(true);
    fetchSpy.mockRestore();
  });

  it("resolveNutritionFoodBarcode uses Nutritionix when hybrid + creds", async () => {
    process.env.NUTRITION_FOOD_PROVIDER = "hybrid";
    process.env.NUTRITIONIX_APP_ID = "app";
    process.env.NUTRITIONIX_APP_KEY = "key";

    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : String(input);
      if (!url.includes("trackapi.nutritionix.com/v2/search/item?upc=")) {
        throw new Error(`unexpected fetch url: ${url}`);
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () =>
          JSON.stringify({
            foods: [
              {
                food_name: "Scanned item",
                brand_name: "Brand",
                nix_item_id: "nix_upc_item",
                nf_calories: 100,
                nf_protein: 5,
                nf_total_carbohydrate: 10,
                nf_total_fat: 3,
                serving_qty: 1,
                serving_unit: "bar",
              },
            ],
          }),
      } as Response;
    });

    const item = await resolveNutritionFoodBarcode("012345678905", testCtx);
    expect(item?.id).toBe("nutritionix:branded:nix_upc_item");
    expect(item?.name).toBe("Scanned item");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const cached = await resolveNutritionFoodBarcode("012345678905", testCtx);
    expect(cached).toEqual(item);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("resolveNutritionFoodDetail loads branded item via Nutritionix", async () => {
    process.env.NUTRITION_FOOD_PROVIDER = "hybrid";
    process.env.NUTRITIONIX_APP_ID = "app";
    process.env.NUTRITIONIX_APP_KEY = "key";

    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : String(input);
      if (!url.includes("nix_item_id=nix_detail")) {
        throw new Error(`unexpected fetch url: ${url}`);
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () =>
          JSON.stringify({
            foods: [
              {
                food_name: "Detail food",
                nix_item_id: "nix_detail",
                nf_calories: 50,
                nf_protein: 2,
                nf_total_carbohydrate: 6,
                nf_total_fat: 1,
                serving_qty: 1,
                serving_unit: "piece",
              },
            ],
          }),
      } as Response;
    });

    const item = await resolveNutritionFoodDetail("nutritionix:branded:nix_detail", testCtx);
    expect(item?.name).toBe("Detail food");
    expect(item?.caloriesKcal).toBe(50);

    const again = await resolveNutritionFoodDetail("nutritionix:branded:nix_detail", testCtx);
    expect(again).toEqual(item);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });
});
