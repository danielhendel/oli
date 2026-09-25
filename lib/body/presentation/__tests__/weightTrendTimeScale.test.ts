import {
  mapWeightTrendTimeToX,
  mapWeightTrendXToTime,
} from "@/lib/body/presentation/weightTrendTimeScale";

describe("weightTrendTimeScale", () => {
  const scale = {
    domainStartMs: Date.UTC(2026, 0, 1, 12, 0, 0),
    domainEndMs: Date.UTC(2026, 0, 20, 12, 0, 0),
    plotLeft: 40,
    plotWidth: 300,
  };

  it("spaces irregular timestamps by time, not index", () => {
    const jan1 = Date.UTC(2026, 0, 1, 12, 0, 0);
    const jan2 = Date.UTC(2026, 0, 2, 12, 0, 0);
    const jan20 = Date.UTC(2026, 0, 20, 12, 0, 0);

    const x1 = mapWeightTrendTimeToX(jan1, scale);
    const x2 = mapWeightTrendTimeToX(jan2, scale);
    const x20 = mapWeightTrendTimeToX(jan20, scale);

    expect(x20 - x2).toBeGreaterThan((x2 - x1) * 10);
    expect(x1).toBeCloseTo(40, 5);
    expect(x20).toBeCloseTo(340, 5);
  });

  it("round-trips screen X ↔ timestamp", () => {
    const t = Date.UTC(2026, 0, 10, 12, 0, 0);
    const x = mapWeightTrendTimeToX(t, scale);
    expect(mapWeightTrendXToTime(x, scale)).toBeCloseTo(t, 0);
  });
});
