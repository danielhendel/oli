import { describe, it, expect } from "@jest/globals";
import { TtlCache } from "../nutritionFoodCache";

describe("TtlCache", () => {
  it("evicts oldest entry when max exceeded", () => {
    const cache = new TtlCache<number>(2);
    cache.set("a", 1, 60_000);
    cache.set("b", 2, 60_000);
    cache.set("c", 3, 60_000);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });
});
