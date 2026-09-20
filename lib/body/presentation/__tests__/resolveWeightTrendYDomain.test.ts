import { resolveWeightTrendYDomain } from "@/lib/body/presentation/resolveWeightTrendYDomain";

describe("resolveWeightTrendYDomain", () => {
  it("returns a padded domain around observed min/max (not zero)", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [73.5, 74.0, 75.5, 74.3],
      valueKind: "mass",
      unitLabel: "lb",
    });
    expect(domain.displayMin).toBeGreaterThan(0);
    expect(domain.displayMin).toBeLessThan(73.5);
    expect(domain.displayMax).toBeGreaterThan(75.5);
  });

  it("enforces a minimum span so tiny changes are not exaggerated", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [74.0, 74.05, 74.1],
      valueKind: "mass",
      unitLabel: "lb",
    });
    const spanLb = (domain.displayMax - domain.displayMin) * 2.2046226218;
    expect(spanLb).toBeGreaterThanOrEqual(11.5);
  });

  it("handles one point without inventing a zero floor", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [74.3],
      valueKind: "mass",
      unitLabel: "lb",
    });
    expect(domain.displayMin).toBeGreaterThan(0);
    expect(domain.displayMax).toBeGreaterThan(domain.displayMin);
  });

  it("ignores non-finite / non-positive values", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [0, Number.NaN, 74, 75],
      valueKind: "mass",
      unitLabel: "kg",
    });
    expect(domain.displayMin).toBeLessThan(74);
    expect(domain.displayMax).toBeGreaterThan(75);
  });
});
