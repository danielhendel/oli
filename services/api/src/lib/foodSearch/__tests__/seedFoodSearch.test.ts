import { describe, it, expect } from "@jest/globals";
import { getSeedFoodById, getSeedSearchDtos, searchSeedFoodCatalog } from "../seedFoodSearch";

function ids(matches: ReturnType<typeof searchSeedFoodCatalog>): string[] {
  return matches.map((m) => m.item.name.toLowerCase());
}

describe("searchSeedFoodCatalog", () => {
  it("finds chicken breast for exact query", () => {
    expect(ids(searchSeedFoodCatalog("chicken")).some((n) => n.includes("chicken breast"))).toBe(true);
  });

  it("tolerates typos: chiken → chicken", () => {
    expect(ids(searchSeedFoodCatalog("chiken")).some((n) => n.includes("chicken"))).toBe(true);
  });

  it("tolerates typos: blueberies → blueberries", () => {
    expect(ids(searchSeedFoodCatalog("blueberies")).some((n) => n.includes("blueberries"))).toBe(true);
  });

  it("finds supplements: creatine", () => {
    expect(ids(searchSeedFoodCatalog("creatine")).some((n) => n.includes("creatine"))).toBe(true);
  });

  it("returns empty for blank query", () => {
    expect(searchSeedFoodCatalog("")).toEqual([]);
  });

  it("seed DTOs carry per100g, servings, source, confidence and canonical ids", () => {
    const dtos = getSeedSearchDtos();
    expect(dtos.length).toBeGreaterThan(30);
    for (const dto of dtos) {
      expect(dto.id.startsWith("oli:fg:")).toBe(true);
      expect(dto.per100g?.caloriesKcal).toBeGreaterThanOrEqual(0);
      expect((dto.servings ?? []).length).toBeGreaterThan(0);
      expect(dto.source === "usda" || dto.source === "curated").toBe(true);
      expect(dto.attributionRequired).toBe(false);
      expect(typeof dto.confidence).toBe("number");
    }
  });

  it("getSeedFoodById resolves every seed DTO by its canonical id", () => {
    const dtos = getSeedSearchDtos();
    for (const dto of dtos) {
      const hit = getSeedFoodById(dto.id);
      expect(hit).not.toBeNull();
      expect(hit?.id).toBe(dto.id);
    }
  });

  it("getSeedFoodById trims input and returns null for unknown ids", () => {
    const first = getSeedSearchDtos()[0];
    expect(getSeedFoodById(`  ${first.id}  `)?.id).toBe(first.id);
    expect(getSeedFoodById("oli:fg:v1:does-not-exist")).toBeNull();
    expect(getSeedFoodById("")).toBeNull();
  });

  it("every P0 food/supplement is resolvable via exact-name search", () => {
    const names = [
      "Eggs",
      "Egg whites",
      "Chicken breast",
      "Rotisserie chicken",
      "Turkey breast",
      "Lean ground beef",
      "Salmon",
      "Tuna",
      "Shrimp",
      "Greek yogurt",
      "White rice",
      "Brown rice",
      "Quinoa",
      "Oats",
      "Sweet potato",
      "Potato",
      "Pasta",
      "Bread",
      "Banana",
      "Apple",
      "Blueberries",
      "Olive oil",
      "Avocado",
      "Almonds",
      "Peanut butter",
      "Broccoli",
      "Spinach",
      "Bell pepper",
      "Onion",
      "Creatine",
      "Magnesium",
      "Vitamin D3",
      "Fish oil",
      "AG1",
      "Whey",
    ];
    for (const name of names) {
      const matches = searchSeedFoodCatalog(name);
      expect(matches.length).toBeGreaterThan(0);
    }
  });
});
