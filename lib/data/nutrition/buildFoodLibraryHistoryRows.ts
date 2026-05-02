import type { NutritionMetaDto } from "@oli/contracts/nutritionMeta";

/** Unified row for Recent tab: deduped meta refs (recents first, then favorites not already listed). */
export type FoodLibraryHistoryRow =
  | {
      kind: "meta";
      key: string;
      ref: NutritionMetaDto["recentFoods"][number];
    };

export function buildFoodLibraryHistoryRows(meta: NutritionMetaDto | null): FoodLibraryHistoryRow[] {
  if (!meta) return [];
  const seen = new Set<string>();
  const out: FoodLibraryHistoryRow[] = [];
  for (const r of meta.recentFoods) {
    if (seen.has(r.foodHash)) continue;
    seen.add(r.foodHash);
    out.push({ kind: "meta", key: `h-${r.foodHash}`, ref: r });
  }
  for (const f of meta.favoriteFoods) {
    if (seen.has(f.foodHash)) continue;
    seen.add(f.foodHash);
    out.push({
      kind: "meta",
      key: `h-${f.foodHash}`,
      ref: {
        id: f.id,
        name: f.name,
        brand: f.brand,
        foodHash: f.foodHash,
        ...(f.oliFoodId !== undefined ? { oliFoodId: f.oliFoodId } : {}),
        lastUsedAt: f.addedAt,
      },
    });
  }
  return out;
}
