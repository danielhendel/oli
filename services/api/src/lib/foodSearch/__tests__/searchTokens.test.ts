import { describe, it, expect } from "@jest/globals";
import { buildFoodSearchTokens } from "../searchTokens";

describe("buildFoodSearchTokens", () => {
  it("Chicken Breast → chicken, breast, chicken breast", () => {
    expect(buildFoodSearchTokens({ name: "Chicken Breast" })).toEqual(["breast", "chicken", "chicken breast"]);
  });

  it("Greek Yogurt → greek, yogurt, greek yogurt", () => {
    expect(buildFoodSearchTokens({ name: "Greek Yogurt" })).toEqual(["greek", "greek yogurt", "yogurt"]);
  });

  it("Vitamin D3 → vitamin, d3, vitamin d3", () => {
    expect(buildFoodSearchTokens({ name: "Vitamin D3" })).toEqual(["d3", "vitamin", "vitamin d3"]);
  });

  it("is deterministic and sorted with no duplicates", () => {
    const a = buildFoodSearchTokens({ name: "Olive Olive Oil" });
    const b = buildFoodSearchTokens({ name: "Olive Olive Oil" });
    expect(a).toEqual(b);
    expect(a).toEqual([...new Set(a)].sort());
  });

  it("includes brand and alias tokens", () => {
    const tokens = buildFoodSearchTokens({ name: "Greens powder", brand: "AG1", aliases: ["athletic greens"] });
    expect(tokens).toContain("ag1");
    expect(tokens).toContain("athletic");
    expect(tokens).toContain("athletic greens");
    expect(tokens).toContain("greens");
  });

  it("single-word names do not produce a phrase token", () => {
    expect(buildFoodSearchTokens({ name: "Creatine" })).toEqual(["creatine"]);
  });
});
