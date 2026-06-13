import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

const mockMetaGet = jest.fn(async () => ({ exists: false, data: () => ({}) }));
const mockPantryGet = jest.fn(async () => ({ docs: [] as unknown[] }));

jest.mock("../../../db", () => {
  const emptyGet = jest.fn(async () => ({ docs: [] }));
  const whereChain = { where: jest.fn(() => ({ limit: jest.fn(() => ({ get: emptyGet })) })), limit: jest.fn(() => ({ get: emptyGet })) };
  return {
    db: {
      runTransaction: jest.fn(async (fn: (t: { get: jest.Mock; set: jest.Mock }) => Promise<void>) => {
        await fn({ get: jest.fn(async () => ({ exists: false })), set: jest.fn() });
      }),
    },
    FieldValue: { serverTimestamp: jest.fn(() => ({})) },
    userNutritionMetaStateDoc: jest.fn(() => ({ get: mockMetaGet })),
    userPantryCollection: jest.fn(() => ({ get: mockPantryGet })),
    foodGraphNodesCollection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn(async () => ({ exists: false })) })), where: jest.fn(() => whereChain) })),
    foodGraphSourceMapCollection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn(async () => ({ exists: false })), set: jest.fn() })) })),
  };
});

import {
  clearNutritionFoodReadCachesForTests,
  resolveNutritionFoodDetail,
  resolveNutritionFoodSearch,
} from "../nutritionFoodReadService";
import { getSeedSearchDtos } from "../../foodSearch/seedFoodSearch";

const ctx = { uid: "search_graph_uid" };

function chickenBreastSeedId(): string {
  const dto = getSeedSearchDtos().find((d) => d.name.toLowerCase().includes("chicken breast"));
  if (!dto) throw new Error("seed chicken breast missing");
  return dto.id;
}

describe("resolveNutritionFoodSearch — graph enabled (seed + ranking + typo tolerance)", () => {
  beforeEach(() => {
    delete process.env.NUTRITION_FOOD_GRAPH_DISABLED; // enabled
    process.env.NUTRITION_FOOD_PROVIDER = "dev";
    clearNutritionFoodReadCachesForTests();
    mockMetaGet.mockReset();
    mockMetaGet.mockResolvedValue({ exists: false, data: () => ({}) });
    mockPantryGet.mockReset();
    mockPantryGet.mockResolvedValue({ docs: [] });
  });

  afterEach(() => {
    delete process.env.NUTRITION_FOOD_PROVIDER;
  });

  it("resolves P0 foods from the seed catalog", async () => {
    const res = await resolveNutritionFoodSearch("chicken", ctx);
    if ("ok" in res) throw new Error("unexpected failure");
    expect(res.items.some((i) => i.name.toLowerCase().includes("chicken breast"))).toBe(true);
  });

  it("tolerates typos via the in-memory seed fuzzy layer (chiken → chicken)", async () => {
    const res = await resolveNutritionFoodSearch("chiken", ctx);
    if ("ok" in res) throw new Error("unexpected failure");
    expect(res.items.some((i) => i.name.toLowerCase().includes("chicken"))).toBe(true);
  });

  it("ranks favorites first", async () => {
    const favId = chickenBreastSeedId();
    mockMetaGet.mockResolvedValue({
      exists: true,
      data: () => ({
        schemaVersion: 1,
        recentFoods: [],
        favoriteFoods: [{ id: favId, oliFoodId: favId, name: "Chicken breast", foodHash: "hash_chicken", addedAt: "2026-01-01T00:00:00.000Z" }],
      }),
    });

    const res = await resolveNutritionFoodSearch("chicken", ctx);
    if ("ok" in res) throw new Error("unexpected failure");
    expect(res.items[0]?.id).toBe(favId);
  });

  it("empty query returns a curated default surface (seed catalog)", async () => {
    const res = await resolveNutritionFoodSearch("", ctx);
    if ("ok" in res) throw new Error("unexpected failure");
    expect(res.items.length).toBeGreaterThan(0);
  });

  it("seed-backed results carry per100g and confidence (Phase A/B carries)", async () => {
    const res = await resolveNutritionFoodSearch("salmon", ctx);
    if ("ok" in res) throw new Error("unexpected failure");
    const salmon = res.items.find((i) => i.name.toLowerCase().includes("salmon"));
    expect(salmon?.per100g?.caloriesKcal).toBeGreaterThan(0);
    expect(typeof salmon?.confidence).toBe("number");
    expect(salmon?.attributionRequired).toBe(false);
  });

  it("resolves detail for a seed id returned by search (Firestore node absent)", async () => {
    // Reproduces the Search → Food Detail 404: search surfaces an in-memory
    // seed DTO (oli:fg:v1:*) that was never persisted to the Food Graph.
    const search = await resolveNutritionFoodSearch("chicken", ctx);
    if ("ok" in search) throw new Error("unexpected failure");
    const seed = search.items.find(
      (i) => i.name.toLowerCase().includes("chicken breast") && i.id.startsWith("oli:fg:v1:"),
    );
    expect(seed).toBeDefined();

    const detail = await resolveNutritionFoodDetail(seed!.id, ctx);
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe(seed!.id);
    expect(detail?.name.toLowerCase()).toContain("chicken");
    // Canonical basis must survive the round-trip (serving picker depends on it).
    expect(detail?.per100g?.caloriesKcal).toBeGreaterThan(0);
    expect((detail?.servings ?? []).length).toBeGreaterThan(0);
  });

  it("resolves detail for a seed supplement id (quick-log ref path uses getFoodById)", async () => {
    const search = await resolveNutritionFoodSearch("creatine", ctx);
    if ("ok" in search) throw new Error("unexpected failure");
    const creatine = search.items.find((i) => i.name.toLowerCase().includes("creatine"));
    expect(creatine?.id.startsWith("oli:fg:")).toBe(true);

    const detail = await resolveNutritionFoodDetail(creatine!.id, ctx);
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe(creatine!.id);
    expect((detail?.servings ?? []).length).toBeGreaterThan(0);
  });

  it("returns null for an unknown oli:fg id (no false positives)", async () => {
    const detail = await resolveNutritionFoodDetail("oli:fg:v1:deadbeefdeadbeef", ctx);
    expect(detail).toBeNull();
  });
});
