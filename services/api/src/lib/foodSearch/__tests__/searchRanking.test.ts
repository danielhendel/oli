import { describe, it, expect } from "@jest/globals";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { rankFoodSearchResults, type RankCandidate } from "../searchRanking";

function item(id: string, name: string, confidence?: number): NutritionFoodSearchItemDto {
  return {
    id,
    name,
    servingLabel: "1 serving",
    caloriesKcal: 100,
    proteinG: 1,
    carbsG: 1,
    fatG: 1,
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

function cand(
  id: string,
  name: string,
  opts: Partial<Omit<RankCandidate, "item">> & { confidence?: number } = {},
): RankCandidate {
  return {
    item: item(id, name, opts.confidence),
    isFavorite: opts.isFavorite ?? false,
    isPantry: opts.isPantry ?? false,
    isRecent: opts.isRecent ?? false,
    matchClass: opts.matchClass ?? "token",
    matchScore: opts.matchScore ?? 100,
  };
}

describe("rankFoodSearchResults", () => {
  it("orders favorites > pantry > recents > others regardless of match class", () => {
    const out = rankFoodSearchResults(
      [
        cand("other", "Other", { matchClass: "exact", matchScore: 1000 }),
        cand("recent", "Recent", { isRecent: true, matchClass: "fuzzy" }),
        cand("pantry", "Pantry", { isPantry: true, matchClass: "fuzzy" }),
        cand("fav", "Fav", { isFavorite: true, matchClass: "fuzzy" }),
      ],
      10,
    );
    expect(out.map((i) => i.id)).toEqual(["fav", "pantry", "recent", "other"]);
  });

  it("within the same membership, exact > token > fuzzy", () => {
    const out = rankFoodSearchResults(
      [
        cand("f", "Fuzzy", { matchClass: "fuzzy" }),
        cand("e", "Exact", { matchClass: "exact" }),
        cand("t", "Token", { matchClass: "token" }),
      ],
      10,
    );
    expect(out.map((i) => i.id)).toEqual(["e", "t", "f"]);
  });

  it("breaks match-class ties by score then confidence then name then id", () => {
    const out = rankFoodSearchResults(
      [
        cand("low", "Z low", { matchClass: "token", matchScore: 100, confidence: 0.2 }),
        cand("high", "A high", { matchClass: "token", matchScore: 200, confidence: 0.1 }),
        cand("confA", "B", { matchClass: "token", matchScore: 100, confidence: 0.9 }),
      ],
      10,
    );
    // highest score first, then higher confidence among equal scores
    expect(out.map((i) => i.id)).toEqual(["high", "confA", "low"]);
  });

  it("excludes non-matching candidates (matchClass none)", () => {
    const out = rankFoodSearchResults([cand("x", "X", { matchClass: "none" })], 10);
    expect(out).toEqual([]);
  });

  it("de-duplicates by id, merging membership and keeping the best match", () => {
    const out = rankFoodSearchResults(
      [
        cand("dup", "Dup", { matchClass: "fuzzy" }),
        cand("dup", "Dup", { isFavorite: true, matchClass: "exact" }),
      ],
      10,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("dup");
  });

  it("is deterministic and stable for equal keys (name then id)", () => {
    const out = rankFoodSearchResults(
      [
        cand("b", "Same", { matchClass: "token", matchScore: 100 }),
        cand("a", "Same", { matchClass: "token", matchScore: 100 }),
      ],
      10,
    );
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("respects maxItems", () => {
    const out = rankFoodSearchResults([cand("a", "A"), cand("b", "B"), cand("c", "C")], 2);
    expect(out).toHaveLength(2);
  });
});
