import { resolveWeightTrendYDomain } from "@/lib/body/presentation/resolveWeightTrendYDomain";

describe("resolveWeightTrendYDomain", () => {
  it("uses clean 10 lb axis domain for mass/lb", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [156.1 / 2.2046226218, 166.5 / 2.2046226218],
      valueKind: "mass",
      unitLabel: "lb",
    });
    // Domain snaps to 150–170 lb in kg.
    expect(domain.displayMin * 2.2046226218).toBeCloseTo(150, 5);
    expect(domain.displayMax * 2.2046226218).toBeCloseTo(170, 5);
  });

  it("uses clean 2 kg axis domain for mass/kg", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [73.2, 75.8],
      valueKind: "mass",
      unitLabel: "kg",
    });
    expect(domain.displayMin % 2).toBe(0);
    expect(domain.displayMax % 2).toBe(0);
    expect(domain.displayMin).toBeLessThanOrEqual(72);
    expect(domain.displayMax).toBeGreaterThanOrEqual(76);
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

  it("pads generic metrics without mass steps", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [18.2, 19.1],
      valueKind: "generic",
      unitLabel: "%",
    });
    expect(domain.displayMin).toBeLessThan(18.2);
    expect(domain.displayMax).toBeGreaterThan(19.1);
  });

  it("ignores non-finite / non-positive values", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [0, Number.NaN, 74, 75],
      valueKind: "mass",
      unitLabel: "kg",
    });
    expect(domain.displayMin).toBeLessThanOrEqual(74);
    expect(domain.displayMax).toBeGreaterThanOrEqual(75);
  });

  it("does not accept classificationBoundariesKg (observation-driven only)", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [73.2, 74.1],
      valueKind: "mass",
      unitLabel: "kg",
    });
    expect(domain.displayMax - domain.displayMin).toBeLessThan(8);
  });
});
