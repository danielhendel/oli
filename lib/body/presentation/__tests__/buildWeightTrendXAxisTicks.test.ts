import {
  buildWeightTrendXScale,
  mapWeightTrendTimeToScreenX,
} from "@/lib/body/presentation/buildWeightTrendXScale";
import {
  buildWeightTrendXAxisTicks,
  evenLayoutNormalizedX,
} from "@/lib/body/presentation/buildWeightTrendXAxisTicks";

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

describe("buildWeightTrendXAxisTicks — even visual layout", () => {
  it("spaces 7D weekday labels evenly and keeps them inside the plot", () => {
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
      plotWidthPx: 340,
      minGapPx: 20,
    });
    expect(ticks.length).toBeGreaterThanOrEqual(6);
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(ticks.every((t) => t.showGridLine)).toBe(true);
    expect(ticks.every((t) => t.showLabel)).toBe(true);
    expect(ticks.map((t) => t.label)).toEqual(
      expect.arrayContaining(["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"]),
    );

    const n = ticks.length;
    for (let i = 0; i < n; i++) {
      expect(ticks[i]!.layoutNormalizedX).toBeCloseTo(evenLayoutNormalizedX(i, n), 8);
    }
    // Half-slot inset: first/last never sit on the raw plot edge (no clipping).
    expect(ticks[0]!.layoutNormalizedX).toBeGreaterThan(0);
    expect(ticks[n - 1]!.layoutNormalizedX).toBeLessThan(1);

    if (n >= 3) {
      const gap0 = ticks[1]!.layoutNormalizedX - ticks[0]!.layoutNormalizedX;
      const gap1 = ticks[2]!.layoutNormalizedX - ticks[1]!.layoutNormalizedX;
      expect(gap0).toBeCloseTo(gap1, 8);
    }
  });

  it("spaces 30D date anchors evenly", () => {
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
    expect(ticks.every((t) => /^\d{1,2}$/.test(t.label))).toBe(true);
    const gaps = ticks
      .slice(1)
      .map((t, i) => t.layoutNormalizedX - ticks[i]!.layoutNormalizedX);
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(gaps[0]!, 8);
    }
  });

  it("spaces month initials evenly for 90D / 6M / 1Y", () => {
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
      const n = ticks.length;
      for (let i = 0; i < n; i++) {
        expect(ticks[i]!.layoutNormalizedX).toBeCloseTo(evenLayoutNormalizedX(i, n), 8);
      }
    }
  });

  it("builds year labels (no month initials) for 3Y / 5Y / All with even spacing", () => {
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
      const n = ticks.length;
      for (let i = 0; i < n; i++) {
        expect(ticks[i]!.layoutNormalizedX).toBeCloseTo(evenLayoutNormalizedX(i, n), 8);
      }
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

  it("aligns vertical grid anchors with label layout positions", () => {
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
      expect(tick.layoutNormalizedX).toBe(tick.layoutNormalizedX);
      expect(tick.showLabel).toBe(true);
    }
    const labeled = ticks.filter((t) => t.showLabel);
    const gridded = ticks.filter((t) => t.showGridLine);
    // Every shown label slot that has a grid line shares the same layout X model.
    for (const g of gridded) {
      const match = labeled.find((l) => l.atMs === g.atMs);
      expect(match?.layoutNormalizedX).toBe(g.layoutNormalizedX);
    }
  });
});
