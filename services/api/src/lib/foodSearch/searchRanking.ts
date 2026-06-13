/**
 * Deterministic Food Graph search ranking (Phase B Task 5).
 *
 * Ranking order (highest priority first):
 *   1. Favorites
 *   2. Pantry
 *   3. Recents
 *   4. Exact match
 *   5. Token match
 *   6. Fuzzy match
 *   7. Confidence
 *
 * Membership (favorite/pantry/recent) dominates match class, which dominates
 * match score, which dominates confidence. All ties are broken by name then id
 * so ordering is fully stable and deterministic (no time/random inputs).
 *
 * Only candidates that actually match the query (matchClass ≠ "none") are
 * returned; membership merely re-orders matching candidates.
 *
 * Pure, no I/O, no `any`.
 */

import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { FoodMatchClass } from "./foodTextMatch";

export interface RankCandidate {
  item: NutritionFoodSearchItemDto;
  isFavorite: boolean;
  isPantry: boolean;
  isRecent: boolean;
  matchClass: FoodMatchClass;
  matchScore: number;
}

function membershipRank(c: RankCandidate): number {
  if (c.isFavorite) return 0;
  if (c.isPantry) return 1;
  if (c.isRecent) return 2;
  return 3;
}

const MATCH_CLASS_RANK: Record<FoodMatchClass, number> = {
  exact: 0,
  token: 1,
  fuzzy: 2,
  none: 3,
};

function confidenceOf(item: NutritionFoodSearchItemDto): number {
  return typeof item.confidence === "number" ? item.confidence : 0;
}

function compareCandidates(a: RankCandidate, b: RankCandidate): number {
  const ma = membershipRank(a);
  const mb = membershipRank(b);
  if (ma !== mb) return ma - mb;

  const ca = MATCH_CLASS_RANK[a.matchClass];
  const cb = MATCH_CLASS_RANK[b.matchClass];
  if (ca !== cb) return ca - cb;

  if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;

  const confA = confidenceOf(a.item);
  const confB = confidenceOf(b.item);
  if (confA !== confB) return confB - confA;

  if (a.item.name !== b.item.name) return a.item.name < b.item.name ? -1 : 1;
  if (a.item.id !== b.item.id) return a.item.id < b.item.id ? -1 : 1;
  return 0;
}

/**
 * Rank + de-duplicate candidates. De-dupe is by `id`, keeping the highest-
 * priority membership flags across duplicate rows before sorting.
 */
export function rankFoodSearchResults(candidates: readonly RankCandidate[], maxItems: number): NutritionFoodSearchItemDto[] {
  const byId = new Map<string, RankCandidate>();
  for (const c of candidates) {
    if (c.matchClass === "none") continue;
    const existing = byId.get(c.item.id);
    if (!existing) {
      byId.set(c.item.id, { ...c });
      continue;
    }
    // Merge membership + keep the strongest match.
    const merged: RankCandidate = {
      item: existing.item,
      isFavorite: existing.isFavorite || c.isFavorite,
      isPantry: existing.isPantry || c.isPantry,
      isRecent: existing.isRecent || c.isRecent,
      matchClass:
        MATCH_CLASS_RANK[c.matchClass] < MATCH_CLASS_RANK[existing.matchClass]
          ? c.matchClass
          : existing.matchClass,
      matchScore: Math.max(existing.matchScore, c.matchScore),
    };
    byId.set(c.item.id, merged);
  }

  const ranked = [...byId.values()].sort(compareCandidates).map((c) => c.item);
  return ranked.slice(0, Math.max(0, maxItems));
}
