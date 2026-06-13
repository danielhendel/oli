/**
 * In-memory P0 seed/supplement search (Phase B).
 *
 * Guarantees that every P0 food/supplement is searchable with typo tolerance
 * regardless of what has been persisted to Firestore yet. Seed nodes are static
 * and converted to DTOs once at module load; matching uses the deterministic
 * fuzzy matcher. This is the "Firestore + tokens + fuzzy" plan's in-process
 * fuzzy layer for curated coverage (broad fuzzy over the whole graph is
 * deferred to Typesense).
 *
 * Pure (aside from one-time static initialization), no I/O, no `any`.
 */

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { getSeedFoodGraphNodes } from "../foodSources/seedFoodCatalog";
import { foodGraphNodeInputToSearchDto } from "../foodSources/foodGraphNodeMapper";
import { buildFoodSearchTokens } from "./searchTokens";
import { bestFoodMatch, type FoodMatchResult } from "./foodTextMatch";

interface SeedSearchRow {
  item: NutritionFoodSearchItemDto;
  fields: string[];
}

const SEED_ROWS: readonly SeedSearchRow[] = getSeedFoodGraphNodes().map((node) => {
  const item = foodGraphNodeInputToSearchDto(node);
  const fields = [node.name, ...(node.brand ? [node.brand] : []), ...buildFoodSearchTokens({ name: node.name, brand: node.brand })];
  return { item, fields };
});

/** Exact canonical-id index for O(1) detail resolution of in-memory seed DTOs. */
const SEED_BY_ID: ReadonlyMap<string, NutritionFoodSearchItemDto> = new Map(
  SEED_ROWS.map((r) => [r.item.id, r.item]),
);

export interface SeedSearchMatch {
  item: NutritionFoodSearchItemDto;
  match: FoodMatchResult;
}

/** All P0 seed DTOs (stable order: foods then supplements). */
export function getSeedSearchDtos(): readonly NutritionFoodSearchItemDto[] {
  return SEED_ROWS.map((r) => r.item);
}

/**
 * Resolve a P0 seed DTO by its exact canonical id (`oli:fg:*`). Pure lookup —
 * no mutation, no I/O, no Firestore write. Returns `null` when unknown.
 *
 * Seed DTOs are searchable in-memory but are not persisted to the Food Graph
 * during search, so detail resolution must consult this index to avoid 404s
 * for unpersisted P0 foods/supplements.
 */
export function getSeedFoodById(id: string): NutritionFoodSearchItemDto | null {
  return SEED_BY_ID.get(id.trim()) ?? null;
}

/** Score every seed row against the query; returns only matching rows. */
export function searchSeedFoodCatalog(query: string, limit = 25): SeedSearchMatch[] {
  const q = query.trim();
  if (q.length === 0) return [];
  const matches: SeedSearchMatch[] = [];
  for (const row of SEED_ROWS) {
    const match = bestFoodMatch(q, row.fields);
    if (match.matchClass !== "none") {
      matches.push({ item: row.item, match });
    }
  }
  return matches.slice(0, Math.max(0, limit));
}
