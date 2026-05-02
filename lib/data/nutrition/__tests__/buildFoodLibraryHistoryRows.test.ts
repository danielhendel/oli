import { defaultNutritionMetaDto } from "@oli/contracts/nutritionMeta";
import { buildFoodLibraryHistoryRows } from "../buildFoodLibraryHistoryRows";

describe("buildFoodLibraryHistoryRows", () => {
  it("dedupes favorites already present in recent by foodHash", () => {
    const meta = defaultNutritionMetaDto();
    meta.recentFoods = [
      {
        id: "oli:fg:a",
        name: "Chicken",
        brand: "Brand",
        foodHash: "h1",
        oliFoodId: "oli:fg:a",
        lastUsedAt: "2026-04-30T12:00:00.000Z",
      },
    ];
    meta.favoriteFoods = [
      {
        id: "oli:fg:a",
        name: "Chicken",
        brand: "Brand",
        foodHash: "h1",
        oliFoodId: "oli:fg:a",
        addedAt: "2026-04-29T12:00:00.000Z",
      },
    ];
    const rows = buildFoodLibraryHistoryRows(meta);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ref.name).toBe("Chicken");
  });

  it("appends favorites not in recent", () => {
    const meta = defaultNutritionMetaDto();
    meta.recentFoods = [];
    meta.favoriteFoods = [
      {
        id: "oli:fg:b",
        name: "Eggs",
        foodHash: "h2",
        addedAt: "2026-04-30T08:00:00.000Z",
      },
    ];
    const rows = buildFoodLibraryHistoryRows(meta);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ref.lastUsedAt).toBe("2026-04-30T08:00:00.000Z");
  });
});
