import {
  buildWeightTrendXScale,
  continuousNormalizedX,
  mapTimeThroughLayoutAnchors,
  mapWeightTrendTimeToScreenX,
} from "@/lib/body/presentation/buildWeightTrendXScale";
import {
  buildWeightTrendXAxisTicks,
  evenLayoutNormalizedX,
} from "@/lib/body/presentation/buildWeightTrendXAxisTicks";

describe("buildWeightTrendXScale — full-width / slot alignment", () => {
  it("maps domain through even 30D label anchors", () => {
    const start = Date.UTC(2026, 7, 26, 12, 0, 0);
    const end = Date.UTC(2026, 8, 21, 12, 0, 0);
    const domainScale = buildWeightTrendXScale({
      range: "30D",
      domainStartMs: start,
      domainEndMs: end,
    });
    const ticks = buildWeightTrendXAxisTicks({
      range: "30D",
      scale: domainScale,
      plotWidthPx: 300,
    });
    const scale = buildWeightTrendXScale({
      range: "30D",
      domainStartMs: start,
      domainEndMs: end,
      layoutAnchors: ticks.map((t) => ({
        atMs: t.atMs,
        layoutNormalizedX: t.layoutNormalizedX,
      })),
    });

    expect(scale.toNormalizedX(ticks[0]!.atMs)).toBeCloseTo(ticks[0]!.layoutNormalizedX, 8);
    expect(scale.toNormalizedX(ticks[ticks.length - 1]!.atMs)).toBeCloseTo(
      ticks[ticks.length - 1]!.layoutNormalizedX,
      8,
    );
  });

  it("aligns month-bucket observations with month-initial label slots", () => {
    const start = Date.UTC(2026, 2, 27, 12, 0, 0);
    const end = Date.UTC(2026, 8, 21, 12, 0, 0);
    const domainScale = buildWeightTrendXScale({
      range: "6M",
      domainStartMs: start,
      domainEndMs: end,
    });
    const ticks = buildWeightTrendXAxisTicks({
      range: "6M",
      scale: domainScale,
      plotWidthPx: 300,
    });
    const june = ticks.find((t) => t.label === "J" && new Date(t.atMs).getUTCMonth() === 5);
    expect(june).toBeDefined();

    const scale = buildWeightTrendXScale({
      range: "6M",
      domainStartMs: start,
      domainEndMs: end,
      layoutAnchors: ticks.map((t) => ({
        atMs: t.atMs,
        layoutNormalizedX: t.layoutNormalizedX,
      })),
    });

    // Exact tick-date observation sits on the label.
    expect(scale.toNormalizedX(june!.atMs)).toBeCloseTo(june!.layoutNormalizedX, 8);

    // Jun 4 is between May and June centers — closer to June, still left of June label.
    const jun4 = Date.UTC(2026, 5, 4, 12, 0, 0);
    const may = ticks.find((t) => new Date(t.atMs).getUTCMonth() === 4)!;
    const jun4X = scale.toNormalizedX(jun4);
    expect(jun4X).toBeGreaterThan(may.layoutNormalizedX);
    expect(jun4X).toBeLessThan(june!.layoutNormalizedX);
  });
});

describe("mapTimeThroughLayoutAnchors", () => {
  it("interpolates halfway between adjacent ticks", () => {
    const anchors = [
      { atMs: 0, layoutNormalizedX: 0.25 },
      { atMs: 100, layoutNormalizedX: 0.5 },
    ];
    expect(mapTimeThroughLayoutAnchors(50, anchors)).toBeCloseTo(0.375, 8);
  });

  it("clamps before first and after last tick", () => {
    const anchors = [
      { atMs: 10, layoutNormalizedX: 0.2 },
      { atMs: 20, layoutNormalizedX: 0.8 },
    ];
    expect(mapTimeThroughLayoutAnchors(0, anchors)).toBeCloseTo(0.2, 8);
    expect(mapTimeThroughLayoutAnchors(30, anchors)).toBeCloseTo(0.8, 8);
  });

  it("handles a single tick", () => {
    expect(
      mapTimeThroughLayoutAnchors(123, [{ atMs: 50, layoutNormalizedX: 0.5 }]),
    ).toBeCloseTo(0.5, 8);
  });
});

describe("buildWeightTrendXAxisTicks — even visual layout", () => {
  it("spaces 7D weekday labels evenly and keeps them inside the plot", () => {
    const start = Date.UTC(2026, 8, 15, 12, 0, 0);
    const end = Date.UTC(2026, 8, 21, 12, 0, 0);
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
    expect(ticks.every((t) => t.showGridLine && t.showLabel)).toBe(true);

    const n = ticks.length;
    for (let i = 0; i < n; i++) {
      expect(ticks[i]!.layoutNormalizedX).toBeCloseTo(evenLayoutNormalizedX(i, n), 8);
    }
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
    const gaps = ticks
      .slice(1)
      .map((t, i) => t.layoutNormalizedX - ticks[i]!.layoutNormalizedX);
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(gaps[0]!, 8);
    }
  });

  it("aligns exact tick-date points with labels for 7D / 30D / 6M / year", () => {
    const cases: {
      range: "7D" | "30D" | "6M" | "3Y";
      start: number;
      end: number;
    }[] = [
      {
        range: "7D",
        start: Date.UTC(2026, 8, 15, 12, 0, 0),
        end: Date.UTC(2026, 8, 21, 12, 0, 0),
      },
      {
        range: "30D",
        start: Date.UTC(2026, 7, 26, 12, 0, 0),
        end: Date.UTC(2026, 8, 21, 12, 0, 0),
      },
      {
        range: "6M",
        start: Date.UTC(2026, 2, 27, 12, 0, 0),
        end: Date.UTC(2026, 8, 21, 12, 0, 0),
      },
      {
        range: "3Y",
        start: Date.UTC(2024, 0, 1, 12, 0, 0),
        end: Date.UTC(2026, 8, 21, 12, 0, 0),
      },
    ];

    for (const c of cases) {
      const domainScale = buildWeightTrendXScale({
        range: c.range,
        domainStartMs: c.start,
        domainEndMs: c.end,
      });
      const ticks = buildWeightTrendXAxisTicks({
        range: c.range,
        scale: domainScale,
        plotWidthPx: 320,
      });
      const scale = buildWeightTrendXScale({
        range: c.range,
        domainStartMs: c.start,
        domainEndMs: c.end,
        layoutAnchors: ticks.map((t) => ({
          atMs: t.atMs,
          layoutNormalizedX: t.layoutNormalizedX,
        })),
      });
      for (const tick of ticks) {
        expect(scale.toNormalizedX(tick.atMs)).toBeCloseTo(tick.layoutNormalizedX, 8);
        expect(
          mapWeightTrendTimeToScreenX(tick.atMs, scale, 10, 300),
        ).toBeCloseTo(10 + tick.layoutNormalizedX * 300, 5);
      }
    }
  });

  it("builds year labels for 3Y / 5Y / All on continuous timestamp positions", () => {
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
      for (const tick of ticks) {
        expect(tick.layoutNormalizedX).toBeCloseTo(
          continuousNormalizedX(tick.atMs, start, end),
          8,
        );
      }
      // Year ticks must be monotonically ordered by continuous time (not even slots).
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i]!.layoutNormalizedX).toBeGreaterThan(ticks[i - 1]!.layoutNormalizedX);
      }
    }
  });
});
