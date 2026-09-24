import { resolveWeightTrendYDomain } from "@/lib/body/presentation/resolveWeightTrendYDomain";

describe("resolveWeightTrendYDomain", () => {
  it("uses clean 5 lb axis domain for mass/lb", () => {
    const domain = resolveWeightTrendYDomain({
      valuesKg: [162.1 / 2.2046226218, 166.5 / 2.2046226218],
      valueKind: "mass",
      unitLabel: "lb",
    });
    // Domain snaps to 160–170 lb in kg.
    expect(domain.displayMin * 2.2046226218).toBeCloseTo(160, 5);
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

  it("gently expands domain to include nearby classification boundaries", () => {
    const without = resolveWeightTrendYDomain({
      valuesKg: [73.2, 74.1],
      valueKind: "mass",
      unitLabel: "kg",
    });
    const withBands = resolveWeightTrendYDomain({
      valuesKg: [73.2, 74.1],
      valueKind: "mass",
      unitLabel: "kg",
      classificationBoundariesKg: [72.25, 72.25 + 10, 72.25 + 20],
    });
    expect(withBands.displayMin).toBeLessThanOrEqual(without.displayMin);
    expect(withBands.displayMax).toBeGreaterThanOrEqual(without.displayMax);
  });
});
