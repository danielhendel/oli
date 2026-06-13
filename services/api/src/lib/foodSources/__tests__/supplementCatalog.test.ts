import { describe, it, expect } from "@jest/globals";
import { foodGraphNodeInputSchema } from "@oli/contracts/nutritionProduct";
import { SUPPLEMENT_NODES } from "../supplementCatalog";

describe("SUPPLEMENT_NODES", () => {
  it("contains the six required curated supplements", () => {
    const names = SUPPLEMENT_NODES.map((n) => n.name.toLowerCase());
    for (const needle of ["creatine", "magnesium", "vitamin d3", "fish oil", "ag1", "whey"]) {
      expect(names.some((n) => n.includes(needle))).toBe(true);
    }
  });

  it("every node is a valid supplement Food Graph input", () => {
    for (const node of SUPPLEMENT_NODES) {
      const parsed = foodGraphNodeInputSchema.parse(node);
      expect(parsed.productType).toBe("supplement");
      expect(parsed.source).toBe("curated");
      expect(parsed.attributionRequired).toBe(false);
      expect(parsed.servings.length).toBeGreaterThan(0);
      expect(parsed.servings.some((s) => s.isDefault)).toBe(true);
    }
  });

  it("uses unique source keys", () => {
    const keys = SUPPLEMENT_NODES.map((n) => n.sourceKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("whey protein carries macros and a scoop dose", () => {
    const whey = SUPPLEMENT_NODES.find((n) => n.sourceKey === "curated:whey_protein");
    expect(whey?.per100g.proteinG).toBe(80);
    expect(whey?.doseUnit).toBe("scoop");
  });
});
