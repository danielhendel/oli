import {
  buildWeightTrendXScale,
  mapWeightTrendTimeToScreenX,
} from "@/lib/body/presentation/buildWeightTrendXScale";
import { buildWeightTrendXAxisTicks } from "@/lib/body/presentation/buildWeightTrendXAxisTicks";

describe("buildWeightTrendXScale — full-width plot", () => {
  it("pins first observation to 0 and latest to 1 (linear / 30D)", () => {
    const start = Date.UTC(2026, 7, 23, 12, 0, 0);
    const end = Date.UTC(2026, 8, 20, 12, 0, 0);
    const scale = buildWeightTrendXScale({
      range: "30D",
      domainStartMs: start,
      domainEndMs: end,
    });
    expect(scale.toNormalizedX(start)).toBeCloseTo(0, 8);
    expect(scale.toNormalizedX(end)).toBeCloseTo(1, 8);
    expect(scale.mode).toBe("linear");
  });

  it("pins first/last on month-bucket 1Y without decorative edge padding", () => {
    const start = Date.UTC(2025, 8, 27, 12, 0, 0); // Sep 27
    const end = Date.UTC(2026, 8, 21, 12, 0, 0); // Sep 21
    const scale = buildWeightTrendXScale({
      range: "1Y",
      domainStartMs: start,
      domainEndMs: end,
    });
    expect(scale.mode).toBe("monthBuckets");
    expect(scale.toNormalizedX(start)).toBeCloseTo(0, 8);
    expect(scale.toNormalizedX(end)).toBeCloseTo(1, 8);

    const plotLeft = 4;
    const plotWidth = 300;
    expect(mapWeightTrendTimeToScreenX(start, scale, plotLeft, plotWidth)).toBeCloseTo(
      plotLeft,
      5,
    );
    expect(mapWeightTrendTimeToScreenX(end, scale, plotLeft, plotWidth)).toBeCloseTo(
      plotLeft + plotWidth,
      5,
    );
  });

  it("pins first/last on 7D day buckets", () => {
    const start = Date.UTC(2026, 8, 15, 8, 0, 0); // Tue
    const end = Date.UTC(2026, 8, 21, 18, 0, 0); // Mon
    const scale = buildWeightTrendXScale({
      range: "7D",
      domainStartMs: start,
      domainEndMs: end,
    });
    expect(scale.mode).toBe("dayBuckets");
    expect(scale.toNormalizedX(start)).toBeCloseTo(0, 8);
    expect(scale.toNormalizedX(end)).toBeCloseTo(1, 8);
  });
});

describe("buildWeightTrendXAxisTicks", () => {
  it("builds weekday labels for 7D on the shared scale", () => {
    const start = Date.UTC(2026, 8, 15, 12, 0, 0); // Tue
    const end = Date.UTC(2026, 8, 21, 12, 0, 0); // Mon
    const scale = buildWeightTrendXScale({
      range: "7D",
      domainStartMs: start,
      domainEndMs: end,
    });
    const ticks = buildWeightTrendXAxisTicks({
      range: "7D",
      scale,
      plotWidthPx: 320,
      minGapPx: 8,
    });
    expect(ticks.length).toBeGreaterThanOrEqual(6);
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(ticks.every((t) => t.showGridLine)).toBe(true);
    expect(ticks.map((t) => t.label)).toEqual(
      expect.arrayContaining(["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"]),
    );
    for (const tick of ticks) {
      expect(tick.normalizedX).toBeCloseTo(scale.toNormalizedX(tick.atMs), 8);
    }
  });

  it("builds 4–5 date-number anchors for 30D", () => {
    const start = Date.UTC(2026, 7, 23, 12, 0, 0);
    const end = Date.UTC(2026, 8, 20, 12, 0, 0);
    const scale = buildWeightTrendXScale({
      range: "30D",
      domainStartMs: start,
      domainEndMs: end,
    });
    const ticks = buildWeightTrendXAxisTicks({
      range: "30D",
      scale,
      plotWidthPx: 300,
    });
    expect(ticks).toHaveLength(5);
    expect(ticks[0]!.normalizedX).toBeCloseTo(0, 5);
    expect(ticks[ticks.length - 1]!.normalizedX).toBeCloseTo(1, 5);
    expect(ticks.every((t) => /^\d{1,2}$/.test(t.label))).toBe(true);
  });

  it("builds month initials for 90D / 6M / 1Y", () => {
    const start = Date.UTC(2026, 2, 27, 12, 0, 0);
    const end = Date.UTC(2026, 8, 21, 12, 0, 0);
    for (const range of ["90D", "6M", "1Y"] as const) {
      const scale = buildWeightTrendXScale({
        range,
        domainStartMs: start,
        domainEndMs: end,
      });
      const ticks = buildWeightTrendXAxisTicks({
        range,
        scale,
        plotWidthPx: 300,
        minGapPx: 10,
      });
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.every((t) => /^[JFMASOND]$/.test(t.label))).toBe(true);
      for (const tick of ticks) {
        expect(tick.normalizedX).toBeCloseTo(scale.toNormalizedX(tick.atMs), 8);
      }
    }
  });

  it("builds year labels (no month initials) for 3Y / 5Y / All", () => {
    const start = Date.UTC(2022, 0, 1, 12, 0, 0);
    const end = Date.UTC(2026, 8, 21, 12, 0, 0);
    for (const range of ["3Y", "5Y", "All"] as const) {
      const scale = buildWeightTrendXScale({
        range,
        domainStartMs: start,
        domainEndMs: end,
      });
      const ticks = buildWeightTrendXAxisTicks({
        range,
        scale,
        plotWidthPx: 300,
      });
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeLessThanOrEqual(6);
      expect(ticks.every((t) => /^\d{4}$/.test(t.label))).toBe(true);
      expect(ticks.every((t) => !/^[JFMASOND]$/.test(t.label))).toBe(true);
    }
  });

  it("adapts All density for long history to ≤6 year labels", () => {
    const start = Date.UTC(2016, 0, 1, 12, 0, 0);
    const end = Date.UTC(2026, 0, 1, 12, 0, 0);
    const scale = buildWeightTrendXScale({
      range: "All",
      domainStartMs: start,
      domainEndMs: end,
    });
    const ticks = buildWeightTrendXAxisTicks({
      range: "All",
      scale,
      plotWidthPx: 300,
    });
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    expect(ticks.length).toBeLessThanOrEqual(6);
  });

  it("aligns vertical grid anchors with tick normalized X", () => {
    const start = Date.UTC(2025, 8, 27, 12, 0, 0);
    const end = Date.UTC(2026, 8, 21, 12, 0, 0);
    const scale = buildWeightTrendXScale({
      range: "1Y",
      domainStartMs: start,
      domainEndMs: end,
    });
    const ticks = buildWeightTrendXAxisTicks({
      range: "1Y",
      scale,
      plotWidthPx: 300,
    });
    for (const tick of ticks.filter((t) => t.showGridLine)) {
      expect(tick.normalizedX).toBeCloseTo(scale.toNormalizedX(tick.atMs), 8);
    }
  });
});
