import { describe, it, expect } from "@jest/globals";
import { bestFoodMatch, boundedLevenshtein, normalizeFoodText, scoreFoodFieldNormalized } from "../foodTextMatch";

describe("normalizeFoodText", () => {
  it("lowercases, strips punctuation, collapses whitespace, keeps digits", () => {
    expect(normalizeFoodText("  Vitamin  D3!! ")).toBe("vitamin d3");
    expect(normalizeFoodText("Chicken_Breast")).toBe("chicken breast");
  });
});

describe("boundedLevenshtein", () => {
  it("returns distance within bound", () => {
    expect(boundedLevenshtein("chiken", "chicken", 2)).toBe(1);
    expect(boundedLevenshtein("blueberies", "blueberries", 2)).toBe(1);
  });
  it("returns null beyond bound", () => {
    expect(boundedLevenshtein("abc", "xyz", 1)).toBeNull();
  });
});

describe("scoreFoodFieldNormalized / bestFoodMatch — typo tolerance", () => {
  it("chicken → chicken (exact token)", () => {
    const r = bestFoodMatch("chicken", ["Chicken Breast"]);
    expect(r.matchClass).toBe("token");
    expect(r.score).toBeGreaterThan(0);
  });

  it("chiken → chicken (fuzzy)", () => {
    const r = bestFoodMatch("chiken", ["Chicken Breast"]);
    expect(r.matchClass).toBe("fuzzy");
  });

  it("blueberies → blueberries (fuzzy)", () => {
    const r = bestFoodMatch("blueberies", ["Blueberries"]);
    expect(r.matchClass).toBe("fuzzy");
  });

  it("creatine → creatine (exact)", () => {
    const r = bestFoodMatch("creatine", ["Creatine monohydrate"]);
    expect(r.matchClass).toBe("token");
    const exact = scoreFoodFieldNormalized("creatine monohydrate", "creatine monohydrate");
    expect(exact.matchClass).toBe("exact");
  });

  it("greek yogrt → greek yogurt (fuzzy on second token)", () => {
    const r = bestFoodMatch("greek yogrt", ["Greek yogurt, plain, nonfat"]);
    expect(r.matchClass).toBe("fuzzy");
  });

  it("fails closed when a query token has no match", () => {
    const r = bestFoodMatch("chicken zzzzq", ["Chicken Breast"]);
    expect(r.matchClass).toBe("none");
  });

  it("full-phrase equality scores exact and highest", () => {
    const r = bestFoodMatch("greek yogurt", ["Greek Yogurt"]);
    expect(r.matchClass).toBe("exact");
    expect(r.score).toBeGreaterThanOrEqual(1000);
  });
});
